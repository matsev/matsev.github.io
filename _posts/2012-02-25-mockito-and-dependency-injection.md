---
title: Mockito and Dependency Injection
categories:
    - Java
    - testing
tags:
    - dependency injection
    - testing
    - Java
    - Java EE
    - jUnit
    - mock
    - Mockito
    - Spring
    - testing
---


When writing your Java unit test you will soon need a way to handle the dependencies of your classes under test. [Mockito](https://site.mockito.org) have some nice features that simplify the creation and usage of mock objects that have improved gradually during the last couple of years.

## Class under test

Imagine that you write an `Example` class that has a `Delegate` dependency. It may be implemented as a POJO with constructor injection: 

```java
public class Example {

    private Delegate delegate;

    Example(Delegate delegate) {
        this.delegate = delegate;
    }

    public void doIt() {
        delegate.execute();
    }
}
```

Alternatively, it could be rewritten using setter injection based on Java EE 6 / JSR 330 annotations: 

```java
@Named("example")
public class Example {

    private Delegate delegate;

    @Inject
    void setDelegate(Delegate delegate) {
        this.delegate = delegate;
    }

    public void doIt() {
        delegate.execute();
    }
}
```

It could also be a Spring bean based on field injection: 

```java
@Component("example")
public class Example {

    @Autowired
    private Delegate delegate;

    public void doIt() {
        delegate.execute();
    }
}
```

There are more ways to refactor this class, but you get the point.

## The Mockito way

It turns out that all these examples can be verified using the same Mockito test: 

```java
@RunWith(MockitoJUnitRunner.class)
public class ExampleTest {

    @Mock
    Delegate delegateMock;

    @InjectMocks
    Example example;

    @Test
    public void testDoIt() {
        example.doIt();

        verify(delegateMock).execute();
    }
}
````

The interesting part of this test is the code that is _not_ there. You may be surprised to find that the test does not contain the traditional boilerplate code associated with jUnit tests such as a `@Before` method, there is no `new Example()` call that instantiates the class under test, nor any application context from which an example bean can be obtained. Moreover, there is no call to the [mock()](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/Mockito.html#mock-java.lang.Class-) method to create the delegate mock object. Despite all this, an `Example` instance will be created, a mock object will be injected into it, and the test will execute and pass. When the [MockitoJUnitRunner](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/junit/MockitoJUnitRunner.html) executes the test, Mockito creates mocks and spies instances for all fields that are annotated with the [@Mock](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/Mock.html) or the [@Spy](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/Spy.html) annotations. Next, the field declaration that is annotated with the [@InjectMocks](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/InjectMocks.html) annotation is instantiated and Mockito injects the mocks and spies into it. This occurs before each test method, so there is no there is no residual state left from any previous test that may affect the current test. From this part onwards, the test behaves like any other test and you can write your assertions and verifications as usual. As can be seen from the above examples, Mockito supports dependency injection by using constructor arguments, setter methods and field injection. The underlying implementation relies on reflection, which means that there is no dependency on the Java EE 6 or Spring annotations as far as Mockito is concerned (obviously, you will get a compile error if you do not add the corresponding dependencies to the class path and your application will fail if there is no matching bean definition in runtime, but that has nothing to do with the unit test).

## Limitations

There are some things you should be aware of when you are writing test this kind of test, such as

*   The order of which the dependency injection is attempted is _constructor injection_, _setter injection_ and lastly _field injection_.
*   Only one dependency injection strategy will occur for each test case. For example, if a suitable constructor is found, neither the setter injection nor the field injection will come to play.
*   Mockito does not report if any dependency injection strategy fails.
*   For constructor injection the "biggest" constructor is chosen, and `null` will be passed as argument for dependencies that are neither mocks nor spies.
*   Fields may not be declared as `final` or `static` (but `private` fields are supported).

Please read the documentation of the [@InjectMocks](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/InjectMocks.html) to learn about the details.

## Dependency

Mockito 1.9.0

## References

*   [Mockito](https://site.mockito.org)
*   [@InjectMocks](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/InjectMocks.html)
*   [@Mock](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/Mock.html)
*   [MockitoJUnitRunner](https://javadoc.io/static/org.mockito/mockito-core/3.6.28/org/mockito/junit/MockitoJUnitRunner.html)