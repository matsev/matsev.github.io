---
title: Spring @PropertySource
categories:
    - Java
tags:
    - Java
    - Spring
--- 


If you are a Spring developer and and you have created a Java based container configuration, you have probably come across the [@PropertySource](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/PropertySource.html) annotation for importing resources. It was first added as part of Spring 3.1, but Spring 4 has added some welcome improvements.

## Basics

Let's start with a simple example:

```java
@Configuration
@PropertySource(value = "classpath:application.properties")
public class ApplicationConfig {

    // more configuration ...
}
```

When executed, properties will be imported from the `application.properties` file, located in the classpath root. `classpath` is the default location, and can thus be omitted:

```java
@Configuration
@PropertySource("application.properties")
public class ApplicationConfig {
}
```

Alternatively, it is possible to specify a `file:` location to appoint a properties file that is located elsewhere on your host environment:

```java
@PropertySource("file:/path/to/application.properties")
```

Other possible resource strings include `http:` and `ftp:`, please see the [Resource chapter](http://docs.spring.io/spring/docs/4.0.x/spring-framework-reference/html/resources.html) in the Spring reference documentation for details.

## Multiple Properties Files

It is also possible to specify two or more files:

```java
@PropertySource({"default.properties", "overriding.properties"})
```

Note that the order of the declared files is important. If the same key is defined in two or more files, the value associated with the key in the last declared file will override any previous value(s).

## ${...} Placeholders

In the [@PropertySource JavaDoc](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/PropertySource.html) it is stated that:

> Any ${...} placeholders present in a @PropertySource resource location will be resolved against the set of property sources already registered against the environment.

Thus, it is possible to specify a system property or an environment variable that will be resolved to its actual value when your application starts. For example, `${CONF_DIR}` below will be replaced with its associated value when the Spring application starts:

```java
@PropertySource("file:${CONF_DIR}/application.properties")
```

```bash
$ echo $CONF_DIR
/path/to/directory/with/app/config/files
```

Of course, you can let the file name be included in the environment variable:

```java
@PropertySource("file:${APP_PROPERTIES}")
````

```bash
$ echo $APP_PROPERTIES
/path/to/application.properties
```

This approach can be very useful if your application needs different properties in different environments, such as client vs. server deployment, Linux vs. Windows target operating system and so on.

## Spring 4

Spring 4 brings two new features to the `@PropertySource`. The first new feature deals with missing files. By default, Spring will throw an exception if it does not find the file that has been declared. Given a project that does not contain a `missing.properties` file, but has the following declaration:

```java
@PropertySource(value = "missing.properties")
```

If one attempts to start the application anyway, there will be a stacktrace accordingly:

```bash
java.lang.IllegalStateException: Failed to load ApplicationContext
[...]
Caused by: java.io.FileNotFoundException: class path resource [missing.properties] cannot be opened because it does not exist
```

To overcome this problem, the `ignoreResourceNotFound` attribute has been added to the `@ProperySource` annotation. Consequently, the declaration:

```java
@PropertySource(value = "missing.properties", ignoreResourceNotFound = true)
```

will cause Spring to silently ignore that the `missing.properties` file cannot be found. This may seem odd at first, if one does not care about the absent file, then why bother to declare it the first place? As will be explained later, there is a very good reason for this. Secondly, there is a new annotation called [@PropertySources](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/PropertySources.html) that allows you to declare repeated `@PropertySource` annotations:

```java
@PropertySources({
    @PropertySource("default.properties"),
    @PropertySource("overriding.properties")
})
```

Yet again, the order of the property file declarations is important. As suggested by the file names in the example above, files declared later will override any previous value(s) if they contain the same key(s).

## Putting It Together

To summarize, a property source configuration can be implemented like:

```java
@Configuration
@PropertySources({
    @PropertySource("default.properties"),
    @PropertySource(value = "file:${CONF_DIR}/optional-override.properties", ignoreResourceNotFound = true)
}
public class ApplicationConfig {
}
```

The `default.properties` file is part of the project jar or war file, and consequently availible on the classpath. However, now we can see that the addition of the `ignoreResourcesNotFound` attribute allow us to _optionally_ override one or more of the properties depending on the deployment environment. Additionally, the use of `file` and the `${...}` placeholder enable a configurable location of this optional properties file. For the record, it is possible to conditionally import properties files in earlier Spring versions as well using placeholders and `:`, but then it was an either / or inclusion on file level. Prior to Spring 4, you were forced to copy all properties to the overriding file even if you only had the need of overriding a single property value. See the [JavaDoc](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/PropertySource.html) for details.

## Java 8

When you migrate update to Java 8, the `@PropertySources` annotation will be redundant, because Java 8 will support [repeating annotations](http://openjdk.java.net/jeps/120):

```java
@Configuration
@PropertySource("default.properties")
@PropertySource(value = "file:${CONF_DIR}/optional-override.properties", ignoreResourceNotFound = true)
public class ApplicationConfig {
}
```

## Edit

In the earlier version of Spring 4, i.e. versions below 4.0.2, an exception will be thrown if a placeholder such as the `${CONF_DIR}` above cannot be resolved, despite that `ignoreResourceNotFound` attribute has been set to `true`. [SPR-11524](https://jira.springsource.org/browse/SPR-11524) addresses this issue, and a solution is scheduled to be released as part of the 4.0.3 version.

## References

*   [@PropertySource JavaDoc](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/PropertySource.html)
*   [@Configuration JavaDoc](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/Configuration.html) (specifically "Working with externalized values")
*   [@Bean JavaDoc](http://docs.spring.io/spring/docs/4.0.0.RELEASE/javadoc-api/org/springframework/context/annotation/Bean.html) (specifically "BeanFactoryPostProcessor-returning @Bean methods")