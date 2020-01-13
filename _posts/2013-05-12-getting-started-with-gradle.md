---
title: Getting Started with Gradle
categories:
    - Java
    - tools
tags: 
    - build systems
    - Gradle
    - Java
    - tools
---


Did you know that there is a Java build system that does not use angle brackets? More and more projects are using [Gradle](http://www.gradle.org/) as an integrated part of their development process. In short, Gradle provides a Groovy DSL for declarative builds based on build conventions. This blog post aims to give you a kickstart if you want to start exploring Gradle yourself by introducing some core concepts and commands.

## Installation

If you have not used Gradle before, you must install it first (unless someone has already migrated your project to Gradle, but we get to that later). Windows and Linux users can download the latest binaries from Gradle's [download page](http://www.gradle.org/downloads) and unpack the zip. Make sure that you add the `GRADLE_HOME/bin` folder to your `PATH` environment variable. For Mac users, you can use [Homebrew](http://brew.sh/) to install the latest package:

```bash
$ brew install gradle
```

Verify that the installation works by calling Gradle from your command line:

```bash
$ gradle -v
------------------------------------------------------------
Gradle 1.6
------------------------------------------------------------
```

If everything is ok, you will see information about the Gradle version, your JVM, OS and so on. Please consult the [installation guide](http://www.gradle.org/docs/1.6/userguide/installation.html) if you have any problem.

## Creating a Project

As of Gradle 1.6 that was released the other day, Gradle provides some support for starting a project from scratch. When executed, the incubating [build setup plugin](http://www.gradle.org/docs/1.6/release-notes#build-setup-plugin) generates some tasks that will generate the basic Gradle files:

```bash
$ gradle setupBuild
:generateBuildFile
:generateSettingsFile
:setupWrapper
:setupBuild

BUILD SUCCESSFUL
```

## Converting a Maven Project

The setup build plugin can also be used to [convert a Maven project](http://www.gradle.org/docs/1.6/userguide/build_setup_plugin.html#N147A2) to a Gradle project. Let's try it out by first using a [Maven archetype](http://maven.apache.org/guides/introduction/introduction-to-archetypes.html) to generate a simple Maven project:

```bash
$ mvn archetype:generate
```

Press enter to accept the suggested archetype, i.e. the `maven-archetype-quickstart`, and then press enter once more to accept the latest version. I use `com.jayway.gradle.example` as 'groupId', and `getting-started` as 'artifactId'. Just keep pressing enter to acknowledge the rest of the suggested default values. Maven generates a simple project with a single class, an accompanying test class and a Maven `pom.xml` build script. Step into the directory and make sure that it works by executing Maven's test command:

```bash
$ cd getting-started
$ mvn test
[...]
Results :
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Now, by invoking the `setupBuild` command the [basic content](http://www.gradle.org/docs/1.6/userguide/build_setup_plugin.html#N147A2) from Maven's `pom.xml` file is extracted and converted into Gradle's corresponding `build.gradle` file:

```bash
$ gradle setupBuild
:maven2Gradle
[...]
BUILD SUCCESSFUL
```

So far so good, now let's proceed with some actual Gradle work.

## Gradle Tasks

Each Gradle project is associated with a set of tasks. Plugin such as the Gradle [Java plugin](http://www.gradle.org/docs/1.6/userguide/tutorial_java_projects.html) provide their own tasks, and developers can [create their own tasks](http://www.gradle.org/docs/1.6/userguide/tutorial_using_tasks.html#N101BC). Consequently, different projects have different tasks. To see what tasks are available for a particular project, the `gradle tasks` command is executed:

```
$ gradle tasks
```

The available Gradle tasks are listed together with a brief description, e.g.

*   build - Assembles and tests this project.
*   clean - Deletes the build directory.
*   help - Displays a help message
*   tasks - Displays the tasks runnable from root project 'getting-started' (some of the displayed tasks may belong to subprojects).
*   test - Runs the unit tests.
*   install - Installs the 'archives' artifacts into the local Maven repository.

To execute a task, one simply calls Gradle and the name of the task:

```bash
$ gradle test
```

As a result, Gradle compiles the source file, compiles the test file and executes the test as one would expect. That is actually several different tasks being executed. Underlying tasks will be executed automatically if required.

## Gradle Files

When the `gradle setupBuild` command was executed, a set of files was generated. The `build.gradle` is the most important of them:

```groovy
apply plugin: 'java'
apply plugin: 'maven'

group = 'com.jayway.gradle.example'
version = '1.0-SNAPSHOT'

description = 'getting-started'

sourceCompatibility = 1.5
targetCompatibility = 1.5

repositories {
    mavenRepo url: "http://repo.maven.apache.org/maven2"
}

dependencies {
    testCompile group: 'junit', name: 'junit', version:'3.8.1'
}
```

*   The first two lines declare the inclusion of two plugins, namely the previously mentioned [Java plugin](http://www.gradle.org/docs/1.6/userguide/tutorial_java_projects.html#N103C6) and the [Maven plugin](http://www.gradle.org/docs/1.6/userguide/maven_plugin.html).
*   The group and version id was imported from the Maven's pom.xml together with a generated description.
*   Next, you may wonder why Gradle has specified such old versions of the Java source and Java target files? Looking at the origin `pom.xml` file does not give any clues, because they were not specified there. The answer resides in Maven's effective pom (`mvn help:effective-pom`) and the implicit usage of the [maven-compiler-plugin](http://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html) which uses the 1.5 version by default. Depending on your project deployment environment, upgrading to a more recent version is strongly encouraged.
*   The [repositories and dependencies](http://www.gradle.org/docs/1.6/userguide/tutorial_java_projects.html#N1043A) have also been included from the Maven script.

Another file that was generated was the [settings.gradle](http://www.gradle.org/docs/1.6/userguide/build_lifecycle.html#sec:settings_file) file, which is used particularly for multi-project builds. Lastly, the files `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar` and the `gradle/wrapper/gradle-wrapper.properties` have all been added by the [Gradle Wrapper](http://www.gradle.org/docs/1.6/userguide/gradle_wrapper.html). The first two files are command line scripts (for *unix and Windows environment respectively) that are used for executing the jar file with the specified properties, which in turn downloads and installs Gradle automatically. In other words, by adding these files to the version control system, it is possible for new team members and continuous integration system to use Gradle _without installing Gradle on beforehand_. As a bonus, it provides a way for the team to make sure that everyone is using exactly the same version of Gradle for the project they are developing.

## Gradle Plugins

The purpose of the [Gradle Plugins](http://www.gradle.org/docs/1.6/userguide/plugins.html) is to enrich projects by adding tasks, dependencies, properties and default values. The [Java plugin](http://www.gradle.org/docs/1.6/userguide/tutorial_java_projects.html) was briefly mentioned earlier. One of its features is that it adds the same folder structure convention as Maven (`src/main/java` as root for the production code `src/test/java` as root for the test code). The external dependency management system is another important feature provided by the Java plugin. The [Maven plugin](http://www.gradle.org/docs/1.6/userguide/maven_plugin.html) was also added to the project when it was created. It allows Gradle to interact with Maven based environment, such as installing the binary file to your local Maven repository, uploading it to a remote repository, etc. Several other plugins are bundled with the Gradle distribution. For example, there is a [Jetty plugin](http://www.gradle.org/docs/current/userguide/jetty_plugin.html), support for [development tools](http://www.gradle.org/docs/current/userguide/standard_plugins.html#N11A9C) such as Eclipse and FindBugs and support for [other programming languages](http://www.gradle.org/docs/current/userguide/standard_plugins.html#N1185F) such as Scala and Groovy. Additionally, there are a number of external plugins, including the [Android Gradle Plugin](http://tools.android.com/tech-docs/new-build-system/user-guide) which one of my colleagues [blogged about](https://blog.jayway.com/2013/02/26/using-gradle-for-building-android-applications/) some time ago.

## Resources

*   [User Guide](http://www.gradle.org/docs/1.6/userguide/userguide.html)
*   [DSL reference](http://www.gradle.org/docs/1.6/dsl/index.html)
*   [Gradle Command Line](http://www.gradle.org/docs/1.6/userguide/gradle_command_line.html)
*   [Build Setup Plugin](http://www.gradle.org/docs/1.6/userguide/build_setup_plugin.html)