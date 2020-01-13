---
title: Improve Your Spring REST API, Part IV
categories:
    - Java
    - web
tags:
    - HTTP
    - Java
    - REST
    - Spring
    - web
---


Spring 4 is around the corner. Milestone releases has been available for a while, [the first release candidate](https://spring.io/blog/2013/11/01/spring-framework-4-0-rc1-available) was released earlier today, and the final release is expected before the end of this year.

## @RestController

One new [feature](https://jira.springsource.org/browse/SPR-10814) that has been added is the `@RestController` annotation, which provide some syntactic sugar to your controller. Take a look at the following code snippet:

```java
@RestController
class PersonController {

    @Autowired
    private PersonService personService;

    @RequestMapping(value = "/person/{id}",
            method = RequestMethod.GET,
            produces = MediaType.APPLICATION_JSON_VALUE)
    Person get(@PathVariable("id") String id) {
        return personService.find(id);
    }
}
```

Did you notice anything different? Ok, there is the new annotation on the class, an autowired dependency, a method that returns a domain object based on a path variable, so what? Look again, did you notice that the `@ResponseBody` annotation was missing from the method declaration? Despite that, the server will return a `Person` instance serialized to JSON in the response body. To make this possible, the `@ResponseBody` annotation has been promoted in Spring 4 to [type level](http://docs.oracle.com/javase/7/docs/api/java/lang/annotation/ElementType.html#TYPE), which means it can be added to classes, interfaces and other annotations. Next, the new `@RestController` annotation is simply created by composing the `@ResponseBody` annotation with the existing `@Controller` annotation (copied from the [source code](https://github.com/spring-projects/spring-framework/blob/master/spring-web/src/main/java/org/springframework/web/bind/annotation/RestController.java)):

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Controller
@ResponseBody
public @interface RestController {
}
```

## Spring 4 RC1

To start using the `@RestController` annotation and explore other Spring 4 features today, you can add the Spring milestone repository to your list of Maven repositories:

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

and update your Spring dependencies to version `4.0.0.RC1`, e.g.

```xml
<dependencies>
    <dependency>
        <groupid>org.springframework</groupid>
        <artifactid>spring-web</artifactid>
        <version>4.0.0.RC1</version>
    </dependency>

    <!-- more dependencies -->

</dependencies>
```