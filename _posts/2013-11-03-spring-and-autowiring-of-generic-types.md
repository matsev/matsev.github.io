---
title: Spring and Autowiring of Generic Types
categories:
    - Java
tags:
    - Java
    - Spring
---


Spring 4 brings some nice improvements to how autowiring of generic types are handled. Before going into details, let's look into the current state of affairs.

## Basics

Consider the following example where you have one generic interface:

```java
interface GenericDao<T> {
    // ...
}
```

And two concrete implementations of it:

```java
@Repository
class FooDao implements GenericDao<Foo> {
    // ...
} 
```

```java
@Repository
class BarDao implements GenericDao<Bar> {
    // ...
}
```

Now, the task is to create a `FooService` that autowires an instance of the `FooDao` class. Using current Spring versions, i.e. versions 3.x, one can either tie the implementation of the `FooService` class to the `FooDao` class:

```java
@Service
class FooService {

    @Autowired
    private FooDao fooDao;
}
```

Or use the [@Qualifer](http://docs.spring.io/spring/docs/3.2.4.RELEASE/javadoc-api/org/springframework/beans/factory/annotation/Qualifier.html) annotation:

```java
@Service
class FooService {

    @Autowired
    @Qualifier("fooDao")
    private GenericDao fooDao;
}
```

However, the disadvantage of these implementations is that they both suffer from coupling. In the first example, the `FooService` implementation is tightly coupled to the `FooDao` class. The second example has less coupling in a way that the `FooService` does not know about the class that implements the `GenericDao`, but there is still some coupling present because the name of the `FooDao` bean is hardcoded in the `FooService` implementation. As of Spring 4 RC1, the issue [SPR-9965](https://jira.springsource.org/browse/SPR-9965) has been solved, which allows us to do autowiring by generic type:

```java
@Service
class FooService {

    @Autowired
    private GenericDao<Foo> fooDao;
}
```

Subtle difference, the key difference is that the `FooService` implementation does not need any information about the implementing `FooDao` bean, they are completely decoupled from each other. Side note, if you attempt to use this solution in a Spring 3.x environment, you will find that it works if your application context contains a single `GenericDao` bean. However, you will get an exception if the application context contains two or more beans. When the generic type is not acknowledged, Spring cannot determine which bean to use:

```bash
NoUniqueBeanDefinitionException: No qualifying bean of type [GenericDao] is defined:
    expected single matching bean but found 2: barDao,fooDao
```
    

## Inheritance

To further investigate the autowiring issue, one can also see how it affects inheritance. In a pre Spring 4 environment, there is a little ceremony to handle inheritance and generic types. First, a `GenericService` needs a constructor with the generic type:

```java
abstract class GenericService<T> {

    private GenericDao<T> dao;

    GenericService(GenericDao<T> dao) {
        this.dao = dao;
    }

    // ...
}
```

Then we yet again have to tightly tie the implementation of a specific service to its specific dao:

```java
@Service
class FooService extends GenericService<Foo> {

    @Autowired
    FooService(FooDao fooDao) {
        super(fooDao);
    }
}
```

Spring 4 also makes it possible to autowire generic class hierarchies. First, we can autowire a `GenericDao` instance to the `GenericService`:

```java
abstract class GenericService<T> {

    @Autowired
    private GenericDao<T> dao;

    // ...
}
```

Next, we can implement the concrete `FooService` by just extending the `GenericService` with the generic type:

```java
@Service
class FooService extends GenericService<Foo> {
}
```

Problem solved with less code and less coupling than before.

## Spring 4 RC1

Spring Framework project lead Juergen Hoeller writes in a [blog post](https://spring.io/blog/2013/11/01/spring-framework-4-0-rc1-available):

> Overall, this is the perfect time to give Spring Framework 4.0 an early try! We'll make sure to incorporate your feedback in a timely fashion on our way to 4.0 GA in December.

Spring 4 RC1 is available in the Spring milestone repository. Add it to your list of Maven repositories:

```xml
<repositories>
    <repository>
        <id>org.springframework.maven.milestone</id>
        <name>Spring Milestone Repository</name>
        <url>http://maven.springframework.org/milestone/</url>
    </repository>

    <!-- more repositories -->

</repositories>
```
    

Update your Spring dependencies to version `4.0.0.RC1` accordingly:

```xml
<dependencies>
    <dependency>
        <groupid>org.springframework</groupid>
        <artifactid>spring-core</artifactid>
        <version>4.0.0.RC1</version>
    </dependency>

    <!-- more dependencies -->

</dependencies>
```
    

## Update

Dec 4th, 2013: Phil Webb has published a blog post at the Spring blog titled [Spring Framework 4.0 and Java Generics](https://spring.io/blog/2013/12/03/spring-framework-4-0-and-java-generics) which further elaborates the topic.

## Update 2

Dec 12th, 2013: Adrian Colyer announced the release of [Spring 4.0](https://spring.io/blog/2013/12/12/announcing-spring-framework-4-0-ga-release) (which means that you should update the version number to `4.0.0.RELEASE`, and that you can remove the declaration of the Spring Milestone Repository in case you used the `4.0.0.RC1` version).