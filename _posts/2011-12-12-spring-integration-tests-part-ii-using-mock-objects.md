---
title: Spring Integration Tests, Part II, Using Mock Objects
categories:
    - Java
    - testing
tags:
    - EasyMock
    - Java
    - mock
    - Mockito
    - Spring
    - testing
---


In the previous post, I wrote how you can use Spring's `FactoryBean` to facilitate the [creation of mock objects]({% post_url 2011-11-30-spring-integration-tests-part-i-creating-mock-objects %}) for Spring integration tests. Now, it is time to use the [EasyMockFactoryBean](https://gist.github.com/1397610#file_easy_mock_factory_bean.java) (in this post [EasyMock](http://www.easymock.org) has been used for creating mock objects, but a similar approach applies to [Mockito](http://www.mockito.org) as well. Start by looking at the [MockitoFactoryBean](https://gist.github.com/1397610#file_mockito_factory_bean.java)). Next, imagine that the `Facade` class and the `Delegate` interface below are part of a bigger system: 

```java
package com.jayway.example;

@Component
public class Facade {

    @Autowired
    private Delegate delegate;

    public String firstMethod() {
        return delegate.doSomething();
    }

    public String secondMethod() {
        return delegate.doSomethingElse();
    }
}
```

```java
package com.jayway.example;

public interface Delegate {

    String doSomething();

    String doSomethingElse();
}
```

Create a matching [easymock-test-config.xml](https://gist.github.com/1427987#file_easymock_test_config.xml) (or [mockito-test-config.xml](https://gist.github.com/1427987#file_movkito_test_config.xml)). Now, we have all the bits and pieces that are needed to start writing the integration test. We start simple to make sure that we autowiring and Spring context has been configured correctly: 

```java
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration("test-config.xml")
public class FacadeTest {

    @Autowired
    Facade facade;

    @Autowired
    Delegate delegateMock;

    @Test
    public void shouldAutowireDependencies() {
        assertNotNull(facade);
        assertNotNull(delegateMock);
    }
}
```

The test is executed and it passes without any problem. A second test is added to the same file with some added mock behavior: 

```java
@Test
public void shouldDelegateToDoSomething() {
    String expected = "hello";

    when(delegateMock.doSomething()).thenReturn(expected);

    String actual = facade.firstMethod();
    assertThat(actual, is(expected));

    verify(delegateMock).doSomething();
}
```

Excellent, that test also passes. Now that we have warmed up, we add a third test to the test class: 

```java
 @Test
 public void shouldDelegateToDoSomethingElse() {
    String expected = "goodbye";
        
    expect(delegateMock.doSomethingElse()).andReturn(expected);

    replay(delegateMock);

    String actual = facade.secondMethod();
    assertThat(actual, is(expected));

    verify(delegateMock);
}
```

As expected, this test also passes without any problem. Unfortunately, that is not always true. A closer investigation reveals that all tests pass when they are executed _individually_. When executing all three tests (either from the IDE or from a build tool like Maven), the third test _fails_ unexpectedly:


```bash
java.lang.AssertionError:
  Unexpected method call Delegate.doSomethingElse():
        at org.easymock.internal.MockInvocationHandler.invoke(MockInvocationHandler.java:44)
	at org.easymock.internal.ObjectMethodsFilter.invoke(ObjectMethodsFilter.java:85)
	at $Proxy8.doSomethingElse(Unknown Source)
        [...]
```

This is EasyMock telling us that the mock object is in the wrong state. An EasyMock mock object goes through a series of steps:

1.  _Initialization_ - Instantiate the mock object.
2.  _Record_ - Record the expectations of the mock object.
3.  _Replay_ - Call `replay()` on the mock object so that it can replay the recorded state.
4.  _Test_ - Execute the test assertions.
5.  _Verify_ - Call `verify()` on the mock object to certify that the recorded mock expectations are fulfilled.

In an ordinary unit test, the mock object is thrown away after the _verify_ phase, a new mock instance is created before the next test that can be used to _record_ the new behavior. However, since we are creating a Spring integration test, there is one more thing to consider.

## Reused beans

In the [testing chapter](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/testing.html#testing-ctx-management) of the Spring manual it is stated that:

> By default, once loaded, the configured ApplicationContext and all of its beans are reused for each test method. Thus the setup cost is incurred only once (per test fixture), and subsequent test execution is much faster.

Consequently, all Spring beans, including mocked beans, will preserve their state between different test methods. The mock object will be in the _verify_ state when the last test begins and not in the _record_ state when `delegateMock.doSomethingElse()` is called. To solve the problem, we need some mechanism to ensure that the mock object is in a known, well-defined state before each test.

## Reset mocks

Both EasyMock and Mockito provide methods to `reset()` the state of the mocked objects. Normally, resetting mock objects in the middle of a test method is considered to be a [potential code smell](http://docs.mockito.googlecode.com/hg/latest/org/mockito/Mockito.html#17), because it is likely that you are testing too much and that the test could be refactored into two separate tests accordingly. Nonetheless, resetting the mock instance [@Before](http://junit.sourceforge.net/javadoc/org/junit/Before.html) each test allow us to keep the same mock instance through the entire lifetime of the test class and yet put it in the _record_ state when before each test starts: 

```java
@Before
public void setUp() {
    reset(delegateMock);
}
```

When executing all tests in the test class, we see that that the problem has been solved and all tests pass. For reference, click the link for the full source code of the [EasyMock test class](https://gist.github.com/1427987#file_easy_mock_facade_test.java) (and the [Mockito test class](https://gist.github.com/1427987#file_mockito_facade_test.java)).

## Comments

You may choose to reset the mocks [@After](http://junit.sourceforge.net/javadoc/org/junit/After.html) each test, the result will be the same. The `reset()` method is called _between_ the different test methods (because of the nature of `@After` and `@Before`), so the code smell of calling reset _within_ a test is avoided. Tests written using Mockito mocks are generally more tolerant for this kind of problem. In contrast to EasyMock, Mockito has no `replay()` method and no notion of steps. Therefore, it is possible to add additional mock expectations and to replace existing expectations, both after the test has been executed as well as after the result has been verified. Hence, you should always reset your mock objects before each test so that you do not get any accidental mocking behavior. As a side note, another solution would be to annotate the test class (or all of its test methods) with the [@DirtiesContext](http://static.springsource.org/spring/docs/3.0.x/javadoc-api/org/springframework/test/annotation/DirtiesContext.html) annotation. This will effectively recreate the entire application context after each test has been executed, causing all Spring beans to be in their initial state and thus the mock beans to be in the _record_ state. Although this will work, there will be a significant performance penalty compared to the suggested `reset()` and `@Before` / `@After` solution, because all beans in the application context will be recreated and re-wired before each test method.

## Dependencies

*   Spring 3.0.6
*   Mockito 1.8.5
*   jUnit 4.10
*   EasyMock 3.1

## References

*   [Spring Reference Manual - Test Context Management and Caching](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/testing.html#testing-ctx-management)
*   [Spring Reference Manual - SpringJunit4ClassRunner](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/testing.html#testcontext-junit4-runner)
*   [Spring Reference Manual - ContextConfiguration](http://static.springsource.org/spring/docs/3.0.x/spring-framework-reference/html/testing.html#integration-testing-annotations)
*   [EasyMock](http://easymock.org/EasyMock3_1_Documentation.html)
*   [Mockito](http://docs.mockito.googlecode.com/hg/org/mockito/Mockito.html)

Previous post: [Spring Integration Tests, Part I, Creating Mock Objects]({% post_url 2011-11-30-spring-integration-tests-part-i-creating-mock-objects %})