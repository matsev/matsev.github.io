---
title: jUnit @Rule and Spring Caches
excerpt: Example of how you can create a custom jUnit @Rule to invalidate Spring caches to avoid residual data when executing integration tests.
categories: 
    - Java
    - testing
tags: 
    - Java
    - jUnit
    - Spring
    - Spring Boot
    - testing
---


If you have worked a while with jUnit you may have seen jUnit [Rules](https://github.com/junit-team/junit/wiki/Rules). Simply put, a field in a test class annotated with [@Rule](http://junit.org/javadoc/latest/org/junit/Rule.html) is a class that lets you execute some code that runs before and/or after your unit test, similar to the [@Before](http://junit.org/javadoc/latest/org/junit/Before.html) and [@After](http://junit.org/javadoc/latest/org/junit/After.html) annotations. Consequently, they solve the same problem, However, the code exercised by the `@Before` and `@After` annotations is usually tied to the specific test class whereas the logic implemented in a `@Rule` tends to be of more generic nature. For example, jUnit provides the [TemporaryFolder](http://junit.org/javadoc/latest/org/junit/rules/TemporaryFolder.html) that creates a temporary folder that can be used during a test and deletes it and any files and folders recursively that were created after the test. Another example is the [ExpectedException](http://junit.org/javadoc/latest/org/junit/rules/ExpectedException.html) that is useful when verifying exceptions.

## Spring Integration Tests

As stated in the [Testing chapter](http://docs.spring.io/spring-framework/docs/4.1.x/spring-framework-reference/html/testing.html#testcontext-ctx-management-caching) in the Spring Reference Docs:

> Once the TestContext framework loads an `ApplicationContext` (or `WebApplicationContext`) for a test, that context will be cached and reused for all subsequent tests that declare the same unique context configuration within the same test suite.

Among other things, this means that if your application contains a cache managed by Spring (for example if you use the [@Cachable](http://docs.spring.io/spring-framework/docs/4.1.x/spring-framework-reference/html/cache.html#cache-annotations-cacheable) annotation), there is a possibility that there are residual objects from previous tests in the cache when a new test begins. As a consequence, you may experience that the tests will behave different during different executions, for example if a single test is executed compared to when it is executed as part of the entire test suite. To prevent this you can either create a specific `@Before` method that clears the cache that can be copied between test files, create a common `AbstractTest` class with the eviction logic that can be inherited to all relevant test classes, create a separate `TestSupport` class that the test classes can delegate to, or create a custom test rule.

## CacheInvalidationRule

```java
@Service
public class CacheInvalidationRule extends ExternalResource {

    private final CacheManager cacheManager;    

    @Autowired
    public CacheInvalidationRule(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @Override
    protected void before() {
        cacheManager.getCacheNames().stream().   // gets the name of all caches as a stream
                map(cacheManager::getCache).     // map the cache names to a stream of Cache:s
                forEach(Cache::clear);           // and clear() them
    }
}
```

Alternatively, if you are not yet able to use Java 8 in production:

```java
@Override
protected void before() {
    Collection cacheNames = cacheManager.getCacheNames();
    for (String name : cacheNames) {
        Cache cache = cacheManager.getCache(name);
        cache.clear();
    }
}
```

The [ExternalResource](http://junit.org/javadoc/latest/org/junit/rules/ExternalResource.html) is an abstract class provided by jUnit which implements the [TestResource](http://junit.org/javadoc/latest/org/junit/rules/TestRule.html) interface. Moreover, it provides an `before()` method and an `after()` method that can be overridden. Here, we chose to clear all caches provided by the cache manager.

## Usage

```java
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(classes = TestApplicationContext.class)
public class ExampleTest {

    @Rule
    @Autowired
    public CacheInvalidationRule cacheInvalidationRule;

    @Test
    public void testThatDependOnClearCaches() {
        // test some application logic
    }
}
```

In order for this to work, the `TestApplicationContext` can either `@ComponentScan` the package in which the `CacheInvalidationRule` is located (since it is annotated with the `@Service` annotation) or declare it as a bean, e.g.

```java
@Configuration
@Import(ApplicationContextThatHasCacheManagerDeclaration.class)
public class TestApplicationContext {

    @Autowired
    private CacheManager cacheManager;

    @Bean
    CacheInvalidationRule cacheInvalidationRule() {
        return new CacheInvalidationRule(cacheManager);
    }
}
```

In either way, the `CacheInvalidationRule` is available in the `TestApplicationContext` and can thus be autowired in the `ExampleTest`. Do not forget the `@Rule` annotation required by jUnit.

## Changing Cache Implementations

Depending on your application requirements, you may choose different cache implementations. If you use simple caches like EhCache or Guava you can probably use the cache configuration like it is. On the other hand, it may not be desirable to have tests that depend on external infrastructure such as a GemFire cluster. One way to avoid this is to add an in memory cache backed by Java's standard `ConcurrentHashMap` to your test configuration:

```java
@Configuration
@EnableCaching
public class InMemoryCacheTestApplicationContext {

    @Bean
    @Primary
    CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        Set caches = new HashSet<>();
        Cache cache = new ConcurrentMapCache("cache");
        caches.add(cache);
        // potentially create and add more caches
        cacheManager.setCaches(caches);
        return cacheManager;
    }

    @Bean
    CacheInvalidationRule cacheInvalidationRule() {
        return new CacheInvalidationRule(cacheManager());
    }
}
```

In the example above, only a single cache was added to the cache manager, but you can easily imagine how more caches can be added. The inclusion of the `@Primary` annotation brings about that it is this cache manager that shall be used by Spring during the test and not the default one that may be included by some other (production) application context.

## Caveat

It is only possible to use the cache invalidation rule if you have access to the cache manager that lives in your application context from the test class. For Spring integration tests (i.e. those that use the `SpringJUnit4ClassRunner`) this is not a problem. However, if you create a webapp that is tested by firing up an embedded Tomcat or embedded Jetty, which starts Spring internally, then the application context and its cache manager is not available to the test class, at least not out of the box. In contrast, Spring Boot can use its embedded servlet container and still have access to its application context, and thus autowire any of its beans, see my previous blog post [Integration Testing a Spring Boot Application]({% post_url 2014-07-04-integration-testing-a-spring-boot-application %}).

## References

*   jUnit [Rules](https://github.com/junit-team/junit/wiki/Rules)
*   jUnit [@Rule](http://junit.org/javadoc/latest/org/junit/Rule.html)
*   jUnit [External Resource](http://junit.org/javadoc/latest/org/junit/rules/ExternalResource.html)
*   Spring [ConcurrentHashMap cache](http://docs.spring.io/spring/docs/4.1.x/spring-framework-reference/html/cache.html#cache-store-configuration-jdk)