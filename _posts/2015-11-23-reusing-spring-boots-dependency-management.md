---
title: Reusing Spring Boot's Dependency Management
excerpt: Blog post about how the Gradle dependency management plugin can be used to reuse curated dependency versions provided by Spring Boot in non-Spring Boot projects. 
categories:
    - Java
    - tools
tags:
    - dependency management
    - Gradle
    - Java
    - Spring Boot
    - tools
---


If you develop a Spring Boot application and are using Gradle, you have already used the [Spring Boot Gradle plugin](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#build-tool-plugins-gradle-plugin). It serves several different purposes such as packaging your project to an executable jar (or war) file, executing the project and it also takes care of version management of third party dependencies. The aim of this blog post is to explain how you can utilize the [dependency management](https://plugins.gradle.org/plugin/io.spring.dependency-management) plugin in a multi module Gradle project where one submodule neither uses the Spring Boot Gradle plugin, nor has a transitive dependency to Spring Boot. Yet, it is able to use the same version of a dependency that is defined by Spring Boot's version management.


## Example Project

A simplified Gradle project has two submodules:

*   The `alpha` module is a standard Java project that has a single Spring framework dependency, see alpha's [build.gradle](#alpha-build-gradle) file.
*   The `beta` module is an executable project that depends on `alpha`, the same Spring framework dependency as well as Spring Boot dependency, see beta's [build.gradle](#beta-build-gradle) file.

Project layout:

```bash
parent
|
+--- build.gradle
+--- gradle.properties
+--- settings.gradle
|
+--- alpha
|    |
|    +--- build.gradle
|    \--- src/main/java/alpha/Alpha.java
|
\--- beta
     |
     +--- build.gradle
     \--- src/main/java/beta/Beta.java
```

Now the challenge is to make sure that the `alpha` and `beta` project the same version of Spring (and possibly other third party libraries that have been "blessed" by Spring Boot) without having to define the version numbers manually or rely on transitive dependency management. In this particular example, you will find that the `4.2.3-RELEASE` of `spring-context` version is used in both submodules, despite that the version number is never defined in the source code.


## Dependency Management

There is a lot of valuable information in the Spring Boot reference guide regarding dependency management. First, you will find that the [Spring Boot Gradle plugin](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#build-tool-plugins-gradle-plugin) uses the dependency management provided by `spring-boot-dependencies`, a Maven BOM file provided by Spring Boot. As such, it contains dependency definitions and corresponding version numbers without actually including them to your project (basically, it is a Maven `pom.xml` file that has `pom` as `<packaging>` and a range of curated dependencies listed in the `<dependencyManagement>` element. If you are interested, you can take a closer look at how this is done in the [spring-boot-dependencies pom.xml](https://github.com/spring-projects/spring-boot/blob/v1.3.0.RELEASE/spring-boot-dependencies/pom.xml) file at GitHub). Secondly, you will find that the Spring Boot Gradle plugin uses the [Dependency Management Plugin](https://github.com/spring-gradle-plugins/dependency-management-plugin/) behind the scenes. This is something that we will take advantage of when we import the Maven BOM file. Finally, there is [an example](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#getting-started-gradle-installation) of how a `build.gradle` file may look like for single module projects. With these facts at hand, we can create a `build.gradle` file for the parent project.


## Parent build.gradle

<a name="parent-build-gradle"></a>The key takeaway of this blog post is the resulting `build.gradle` file in the `parent` module. As we will see later, this will make the submodules `build.gradle` files very succinct. Here it is being presented in its entirety, but you can scroll down to read explanations for each `// #nbr`.

```groovy
// 1
buildscript {
    repositories {
        // 2
        jcenter()
    }
    // 3
    dependencies {
        classpath('io.spring.gradle:dependency-management-plugin:0.5.3.RELEASE')
        classpath("org.springframework.boot:spring-boot-gradle-plugin:${springBootVersion}")
    }
}

// 4
subprojects {
    repositories {
        // 5
        jcenter()
    }

    // 6
    apply plugin: 'java'
    apply plugin: 'io.spring.dependency-management'

    dependencyManagement {
        imports {
            // 7
            mavenBom("org.springframework.boot:spring-boot-dependencies:${springBootVersion}")
        }
    }
}
```


## Explanations

1. The [buildScript](https://docs.gradle.org/2.9/userguide/organizing_build_logic.html#sec:external_dependencies) method is used if your Gradle build script uses external plugins such as the `dependency-management-plugin` and the `spring-boot-gradle-plugin`.
2. Define which Maven repository should be used to download external Gradle plugins. `jcenter()` points to a Maven repository provided by Bintray located available at [https://bintray.com/bintray/jcenter](https://bintray.com/bintray/jcenter).
3. Add the two external Gradle plugins to the buildscript classpath so that they can be used by the buildscript itself. The `${springBootVersion}` is specified in the [gradle.properties](#gradle-properties) file so that it can be re-used.
4. The `subprojects` method allow us to define configuration that is shared between all subprojects, i.e. `alpha` and `beta` in this example (side note, Gradle also has an `allprojects` method).
5. Repeat `repositories` method, this time for defining the location(s) of the project dependencies.
6. Apply the [dependency management plugin.](https://github.com/spring-gradle-plugins/dependency-management-plugin)
7. Declare which Maven BOM to import. Specifically for this example, you will find that the [spring-boot-dependencies pom.xml](https://github.com/spring-projects/spring-boot/blob/v1.3.0.RELEASE/spring-boot-dependencies/pom.xml) file mentioned earlier has a `<spring.version>4.2.3.RELEASE</spring.version>` property in addition to the declaration of the `spring-core` dependency.


## Code Snippets

<a name="alpha-build-gradle"></a>Alpha's `build.gradle`. Note that we do not specify which version of `spring-context` is used. It is handled by the `mavenBom` import of the `spring-boot-dependencies` in the [Parent build.gradle](#parent-build-gradle).

```groovy
dependencies {
    compile('org.springframework:spring-context')
}
```

<a name="beta-build-gradle"></a>Beta's `build.gradle`. Neither the version of `spring-context` nor `spring-boot-starter` need to be specified, but the `spring-boot` plugin has been added so that the module can be executed and packaged as an executable jar.

```groovy
apply plugin: 'spring-boot'

dependencies {
    compile project(':alpha')
    compile('org.springframework:spring-context')
    compile('org.springframework.boot:spring-boot-starter')
}
```

Shared `gradle.properties`

```properties
springBootVersion = 1.3.0.RELEASE
```

The project's `settings.gradle`

```groovy
include 'alpha'
include 'beta'
```

Java classes

```java
package alpha;

import org.springframework.stereotype.Component;

@Component
public class Alpha {

    public String hello() {
        return "Hello from Alpha!";
    }
}
```

```java
package beta;

import alpha.Alpha;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication(scanBasePackages = {"alpha", "beta"})
public class Beta {

    public static void main(String[] args) {
        SpringApplication.run(Beta.class, args);
    }

    @Bean
    CommandLineRunner commandLineRunner(Alpha alpha) {
        return args -> System.out.println(alpha.hello());
    }
}
```

## Executions

Listing of alpha's dependencies:

```bash
$ gradle alpha:dependencies
[...]
default - Configuration for default artifacts.
\--- org.springframework:spring-context: -> 4.2.3.RELEASE
[...]
```

Listing of beta's dependencies:

```bash
$ gradle beta:dependencies
[...]
default - Configuration for default artifacts.
+--- project :alpha
|    \--- org.springframework:spring-context: -> 4.2.3.RELEASE
[...]
+--- org.springframework:spring-context: -> 4.2.3.RELEASE (*)
\--- org.springframework.boot:spring-boot-starter: -> 1.3.0.RELEASE
[...]
(*) - dependencies omitted (listed previously)
```

Project execution:

```bash
$ gradle beta:bootRun
[...]
Hello from Alpha!
[...]
```

## Acknowledgements

Thanks to Opal for [answering](http://stackoverflow.com/a/33714077/303598) my question at Stack Overflow.

## References

*   [Better dependency management for Gradle](https://spring.io/blog/2015/02/23/better-dependency-management-for-gradle) Spring blog post.
*   [Dependency Management](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#using-boot-dependency-management) chapter, Spring Boot reference.
*   [Gradle](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#using-boot-gradle) chapter, Spring Boot reference guide.
*   [Spring Boot Gradle plugin](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#build-tool-plugins-gradle-plugin).
*   [Gradle dependency management](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#build-tool-plugins-gradle-dependency-management) chapter, Spring Boot reference guide.
*   [Dependency management plugin](https://github.com/spring-gradle-plugins/dependency-management-plugin/).
*   [Dependency versions](http://docs.spring.io/spring-boot/docs/1.3.x/reference/htmlsingle/#appendix-dependency-versions) of third party dependencies defined in Spring Boot version 1.3.