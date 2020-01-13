---
title: Working Efficiently with Gradle Modules
excerpt: Blog post about how different Gradle command line options and tasks can improve your efficiency when working with a multi-module Gradle project.
categories:
    - Java
    - tools
tags:
    - dependency management
    - Gradle
    - Java
    - tools
---


Gradle has the ability to check if a task is up to date and more importantly [skip the task](https://docs.gradle.org/2.9/userguide/more_about_tasks.html#sec:up_to_date_checks) if it finds that the task input is unchanged compared to the latest build. This feature results in significant build time reductions, but as we will see in this blog post we can do even better if we know what module(s) we would like to build. A couple of years ago, I wrote a similar [blog post]({% post_url 2013-06-09-working-efficiently-with-maven-modules %}) about how you can work more efficiently with Maven by being selective when building your multi-module project. This blog post deals with the same issue, however this time Gradle is used.

## Project

Let us assume that we have a project structure with the modules below and that we will add a new feature to the `b1` module:

```bash
parent
|
├── a
│   ├── a1
│   └── a2
|
├── b
│   ├── b1              (module under development, depends on a1)
│   └── b2
|
├── itest               (integration tests)
|   |
│   ├── a-itest
│   │   ├── a1-itest    (depends on a1)
│   │   └── a2-itest    (depends on a2)
│   │
│   └── b-itest
│       ├── b1-itest    (depends on b1)
│       └── b2-itest    (depends on b2)
```

If you open a terminal in the `parent` folder and execute `gradle build`, then all projects will be compiled, the tests will be executed, integration tests will be executed and so on. All is good, but it may take a while before all work has been completed. In the following example, we will see how it is possible to work on the `b1` module without rebuilding the non-dependent `a2*` and `b2*` modules.

## Build

When you update your code from version control before you start working on a new feature, it is a good idea to make sure that the module you will work with is in a good state. If you trust your continuous integration server, it should be sufficient to build just that specific module and the modules that it depends on. The [Java plugin's](https://docs.gradle.org/2.9/userguide/java_plugin.html) `build` task does exactly that. There are a few different ways to specify which module should be built. For example, if you would like to build `b1` you can target it by either its (sub)module name followed by the `build` task:

```bash
$ gradle :b:b1:build
```

or you can target the module by its directory location if you use the `-p` (or `--project-dir`) option:

```bash
$ gradle -p b/b1 build
```

It is also possible to execute the `build.gradle` file directly by using the `-b` (or `--build-file`) option:

```bash
$ gradle -b b/b1/build.gradle build
```

This last approach is discouraged in multi-module projects (more information can be found in the [Selecting which build to execute](https://docs.gradle.org/2.9/userguide/tutorial_gradle_command_line.html#sec:selecting_build) chapter in the Gradle user manual). Please note that only a limited set of tasks necessary to generate the required dependencies are executed. In particular, no tests are executed on the upstream modules, i.e. `a1` will be built without verification of its accommodating unit tests. If you would like to build more than one module, just add the modules and their corresponding tasks:

```bash
$ gradle :b:b1:build :b:b2:build
```

## Build Needed

The `buildNeeded` is similar to the `build` task in that it builds a module and all upstream modules that it depends on. The difference is that it performs a full build of the upstream modules, including tests.

```bash
$ gradle b:b1:buildNeeded
```

Consequently, both `a1` and `b1` will be built fully.

## Build Dependents

When you have finished the implementation of your `b1` feature, you would probably like to make sure that all downstream modules that depend on `b1` still work. To build the `b1` project and its depending project(s), in this example represented by the `b1-itest` project you can use the `buildDependents` task:

```bash
$ gradle b:b1:buildDependents
```

## Avoid Rebuilding Project Dependencies

What about those occasions when you are in the middle of a refactoring, there are no upstream project changes and you know for sure that you have broken downstream dependencies, but you would like to know if just the specific module compiles and its tests pass? Enter the `-a` (or `--no-rebuild`) option:

```bash
$ gradle -a b:b1:build
```

Consequently, this module build will fail if the upstream dependencies have not been built previously or if you have executed `gradle clean`. Likewise, you may get a false positive build if an upstream dependency has been updated and you still build against the old binary version.

## References

*   [Gradle user guide](https://docs.gradle.org/2.9/userguide/userguide.html).
*   [The Java Plugin](https://docs.gradle.org/2.9/userguide/java_plugin.html) - Gradle user guide.
*   [Multi-project builds](https://docs.gradle.org/2.9/userguide/multi_project_builds.html) - Gradle user guide.
*   [Selecting which build to execute](https://docs.gradle.org/2.9/userguide/tutorial_gradle_command_line.html#sec:selecting_build) - Gradle user guide.
*   [Gradle command line](https://docs.gradle.org/2.9/userguide/gradle_command_line.html) - Appendix D in the Gradle user guide.