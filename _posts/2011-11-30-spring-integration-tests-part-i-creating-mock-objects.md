---
title: Spring Integration Tests, Part I, Creating Mock Objects
categories:
    - Java
    - testing
tags: 
    - EasyMock
    - factory-method
    - factorybean
    - Java
    - Mockito
    - Spring
    - testing
---


When writing integration tests with Spring, it can sometimes be convenient to mock one or more of Spring bean dependencies. However, during some circumstances strange things may happen... (In this post, [Mockito](http://www.mockito.org) has been used for creating mock objects, but the same problem applies to [EasyMock](http://www.easymock.org) as well. You can find the corresponding files if you follow the provided links.)

## Test setup

In the following example the `SomeClass` needs a reference to an instance of the `SomeDependency` interface:

```java
package com.jayway.example;

@Component
public class SomeClass {

    @Autowired
    private SomeDependency someDependency;

    // more code...
}
```

```java
package com.jayway.example;

public interface SomeDependency {
}
```

When writing the integration test, we use the static [Mockito.mock(Class classToMock)](http://docs.mockito.googlecode.com/hg/org/mockito/Mockito.html#mock(java.lang.Class)) method to create a mock instance. The straightforward approach would be to let Spring instantiate the mock object with a [static factory method](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/beans.html#beans-factory-class-static-factory-method) in the xml configuration, e.g. 

```xml
<beans...>
    <context:component-scan base-package="com.jayway.example"/>

    <bean id="someDependencyMock" class="org.mockito.Mockito" factory-method="mock">
        <constructor-arg value="com.jayway.example.SomeDependency" />
    </bean>
</beans>
```

(Corresponding [EasyMock config](https://gist.github.com/1397610#file_failing_easymock_config.xml).) 

To verify that the beans are created and wired correctly, we write a simple test:

```java
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration("failing-mockito-config.xml")
public class BeanWiringTest {

    @Autowired
    SomeClass someClass;

    @Autowired
    SomeDependency someDependencyMock;

    @Test
    public void shouldAutowireDependencies() {
        assertNotNull(someClass);
        assertNotNull(someDependencyMock);
    }
}
```

(Same test for EasyMock, just update the `@ContextConfiguration` with the EasyMock config file.) To our surprise, the test fails:

```bash
[...]
java.lang.IllegalStateException: Failed to load ApplicationContext
Caused by: org.springframework.beans.factory.BeanCreationException:
    Error creating bean with name 'someClass': Injection of autowired dependencies failed;
nested exception is org.springframework.beans.factory.BeanCreationException:
    Could not autowire field: private com.jayway.example.SomeDependency com.jayway.example.SomeClass.someDependency;
nested exception is org.springframework.beans.factory.NoSuchBeanDefinitionException:
    No matching bean of type [com.jayway.example.SomeDependency] found for dependency:
    expected at least 1 bean which qualifies as autowire candidate for this dependency.
    Dependency annotations: {@org.springframework.beans.factory.annotation.Autowired(required=true)}
[...]
```

## Explanation

In order to find a solution to the problem, we need to understand Spring's initialization process:

1.  _Load bean definitions._ This step includes scanning the application context XML files, scanning packages defined by `component-scan`, and loading the bean definitions found into the bean factory. (BeanFactoryPostProcessors such as the PropertyPlaceHolderConfigurer may be called to update the bean definitions.)
2.  _Instantiate beans and store them in the application context._ The bean factory creates the bean from the bean definitions. Bean dependencies get injected.
3.  _Bean post processing._ All initializing methods (e.g. annotated with `@PostConstruct`, `init-method`s declared in the XML and the `afterPropertiesSet()` method will execute. Annotations such as `@Required` will be validated. Dynamic proxies in an AOP environment will be created and so on.

The problem that we see occurs due to a corner case in the first two steps. When the bean definition is created Spring scans through the application context XML file. It finds the declaration of the mock bean and a reflective call is made to find out the return type of the method defined by the `factory-method` declaration in an attempt to determine the bean's type. The return type of this method is declared as the formal type parameter `<T>` (remember that we use the

[Mockito.mock(Class&lt;T&gt; classToMock)](http://docs.mockito.googlecode.com/hg/org/mockito/Mockito.html#mock(java.lang.Class)) as factory method). Consequently, the bean definition of `someDependencyMock` will be of `java.lang.Object` and not `SomeDependency` as one would think. In the second step, the `someClass` bean is instantiated. Springs discovers the `@Autowired` annotation and tries to fetch an existing `SomeDependency` bean from the application context. None has yet been created, so the bean factory proceeds and looks for suitable bean definition in order to create an instance of the requested bean on the fly. This operation fails because the bean definition of `someDependency` is mapped to `java.lang.Object`. At this point, Spring bails out and throws the `NoSuchBeanDefinitionException`.

## FactoryBean to the rescue

The problem is solved by implementing a custom [FactoryBean](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/beans.html#beans-factory-extension-factorybean) that can be used whenever we need to mock an object: 

```java
package com.jayway.springmock;

import org.mockito.Mockito;
import org.springframework.beans.factory.FactoryBean;

/**
 * A {@link FactoryBean} for creating mocked beans based on Mockito so that they 
 * can be {@link @Autowired} into Spring test configurations.
 *
 * @author Mattias Severson, Jayway
 *
 * @see FactoryBean
 * @see org.mockito.Mockito
 */
public class MockitoFactoryBean<T> implements FactoryBean<T> {

    private Class<T> classToBeMocked;

    /**
     * Creates a Mockito mock instance of the provided class.
     * @param classToBeMocked The class to be mocked.
     */
    public MockitoFactoryBean(Class<T> classToBeMocked) {
        this.classToBeMocked = classToBeMocked;
    }

    @Override
    public T getObject() throws Exception {
        return Mockito.mock(classToBeMocked);
    }

    @Override
    public Class<?> getObjectType() {
        return classToBeMocked;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }
}
```

(In the [EasyMockFactoryBean](https://gist.github.com/1397610#file_easy_mock_factory_bean.java), I have added an enum to define the type of mock object.) 

Next, the Spring test config is updated to use the factory bean: 

```xml
<beans...>
    <context:component-scan base-package="com.jayway.example"/>

    <bean id="someDependencyMock" class="com.jayway.springmock.MockitoFactoryBean">
        <constructor-arg name="classToBeMocked" value="com.jayway.example.SomeDependency" />
    </bean>
</beans>
```

(Corresponding [EasyMock config](https://gist.github.com/1397610#file_easymock_factory_bean.xml).) Spring will still instantiate the beans in the order that they were declared in the `mockito-test-config.xml`, i.e. starting by creating an instance of `SomeClass` and then attempt to inject an instance of a `SomeDependency` into it before any has been created. The good news is that bean factory will scan through all declared `FactoryBean`s, calls its [getObjectType()](http://static.springsource.org/spring/docs/3.0.x/javadoc-api/org/springframework/beans/factory/FactoryBean.html#getObjectType()) method, and if the returned type is correct, call its [getObject()](http://static.springsource.org/spring/docs/3.0.x/javadoc-api/org/springframework/beans/factory/FactoryBean.html#getObject()) which should return an instance of the requested type.

## Alternative solution

There is another more brittle solution to the problem. By simply changing the order of the tags in the initial application context, e.g. putting the bean declaration that defines the mock above the component scan, will cause the test to pass. The bean definition will still be wrong in the sense that the `someDependencyMock` will be defined as a `java.lang.Object`, but there is another important difference. In this case, the bean factory will invoke the [Mockito.mock(Class&lt;T&gt; classToMock)](http://docs.mockito.googlecode.com/hg/org/mockito/Mockito.html#mock(java.lang.Class)) method with `SomeDependency` as parameter causing the `someDependencyMock` bean to be created and subsequently stored in the application context. Later, the `someClass` bean is created and the dependency can obtained from the application context when requested by the bean factory and the wiring of the beans will succeed. However, making sure that the order of the bean declarations in the XML is always correct may neither be simple nor obvious, and it will get increasingly more difficult the more beans you add to the configuration.

## Disclaimer

As stated in the in the first paragraph, I would only consider this solution for _integration_ tests because of performance reasons. The application context itself adds some overhead, but the big performance hit is to create and wire all beans that are associated with it. When writing _unit_ tests there is no need for this, so you could revert to constructor or setter dependency injection, Spring's [ReflectionTestUtils.setField()](http://static.springsource.org/spring/docs/3.0.x/javadoc-api/org/springframework/test/util/ReflectionTestUtils.html#setField%28java.lang.Object,%20java.lang.String,%20java.lang.Object%29), PowerMock's [Whitebox.setInternalState()](http://powermock.googlecode.com/svn/docs/powermock-1.4.10/apidocs/org/powermock/reflect/Whitebox.html#setInternalState%28java.lang.Object,%20java.lang.Class,%20java.lang.Object%29), Mockito's [@InjectMocks](http://docs.mockito.googlecode.com/hg/org/mockito/InjectMocks.html) or similar techniques.

## Acknowledgements

Thanks to [Wilhelm Kleu](http://stackoverflow.com/users/97641/wilhelm-kleu) at stack overflow for [suggesting](http://stackoverflow.com/questions/6340007/autowiring-of-beans-generated-by-easymock-factory-method/6340391#6340391) the solution and to [Mattias Hellborg Arthursson](http://blog.jayway.com/author/mattiasarthursson/) for valuable discussions.

## Dependencies

*   Spring 3.0.6
*   Mockito 1.8.5
*   jUnit 4.10
*   EasyMock 3.1

## References

*   [Spring Reference Manual - Static Factory Method](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/beans.html#beans-factory-class-static-factory-method)
*   [Spring Reference Manual - FactoryBean](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/beans.html#beans-factory-extension-factorybean)
*   [Spring Reference Manual - Integration Testing](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/testing.html#integration-testing-annotations)
*   [Mockito](http://docs.mockito.googlecode.com/hg/org/mockito/Mockito.html)
*   [EasyMock](http://easymock.org/EasyMock3_1_Documentation.html)

Next post: [Spring Integration Tests, Part II, Using Mock Objects]({% post_url 2011-12-12-spring-integration-tests-part-ii-using-mock-objects %})

## Edit

As of Spring 3.2 RC1, the problem with generic factory methods and mock object has been [solved](http://blog.springsource.org/2012/11/07/spring-framework-3-2-rc1-new-testing-features/).