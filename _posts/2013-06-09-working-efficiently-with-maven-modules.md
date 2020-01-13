---
title: Working Efficiently with Maven Modules
categories:
    - Java
    - tools
tags: 
    - build systems
    - Java
    - Maven
    - tools
---


When working with Java you will sooner or later come across Maven and Maven modules. Before you start developing a new module feature, upstream modules need to be built, and before you finish you must build downstream modules to make sure that you have not broken any dependencies or tests. However, it is not always obvious how different modules relate to each other. If you just call `mvn clean install` at the project root it does not really matter, but as the project grows the builds will become more and more tedious. This blog aims to demonstrate how you can take advantage of Maven command line options to work in a smarter, more efficient way.

## Project

Let us assume that we have a project structure with the modules below and that we will add a new feature to the _A1_ module:

```bash
master
  |
  +- A
  |  +- A1           (the module under development)
  |  +- A2
  |
  +- B
  |  +- B1           (depends on A1)
  |  +- B2
  |
  +- ITest           (integration tests enabled by the "itest" profile)
  |  +- A-ITest
  |  |  +- A1-ITest  (depends on A1)
  |  |  +- A2-ITest  (depends on A2)
  |  |
  |  +- B-ITest
  |  |  +- B1-ITest  (depends on B1)
  |  |  +- B2-ITest  (depends on B2)
  |
  +- more modules...
```

If you are in the _master_ folder and execute `mvn clean install -Pitest`, then all projects will be compiled, tests will be executed, integration tests will be executed and the resulting binaries will be deployed to your local Maven repo as expected. All is good, but it may take a while to complete. In the following example, we will see how it is possible to work on the _A1_ module without rebuilding the non-dependent _A2*_ and _B2*_ modules.

## Build a single module

If you are working with a single module, it is possible to compile and test just the specific project by providing the `-pl` (or `--projects`) option and add a colon before the specific artifact id. For example, if you just would like to build the _A1_ project, simply execute:

```bash
mvn -pl :A1 clean install
```

If you would like to build more than one project, just add list the artifact ids separated by comma. To build both _A1_ and _A2_:

```bash
mvn -pl :A1,:A2 clean install
```

## Build dependencies and module

Building a single module will only work if you have access to its dependencies. If it is the first time you build a project, or if you have updated your project with the latest changes from the version control, you may have to rebuild the module's upstream dependencies. Continuing with the example, this implies that you need to build both the _master_ and the _A_ module before attempting to build the _A1_ module. Of course, the just mentioned `-pl` can be used, but there is another Maven option that works out the dependency graph for you so that the _master_, _A_ and _A1_ will be built in one command. The `-am` (or `--also-make`), option does exactly that:

```bash
mvn -pl :A1 -am clean install
```

## Build module and dependents

When you have finished the implementation of your _A1_ feature, you would like to be sure that all downstream modules that depend on _A1_ still works. To build the _A1_ and the _B1_ projects in one command you can use the `-amd` (or `--also-make-dependents`) option:

```bash
mvn -pl :A1 -amd clean install
```

Similarly, if you also would like to execute the integration test, you must enable the _itest_ profile with the `-P` option. The modules _A1_, _B2_, _A1-ITest_ and _B1-ITest_ will be built consequently:

```bash
mvn -Pitest -pl :A1 -amd clean install
```

## Reference

Maven has many other command line options such as `-o`, `-fae` and `-rf` that can be used to tweak and improve your builds if used wisely. See the Maven [command line help](http://books.sonatype.com/mvnref-book/reference/running-sect-options.html#running-sect-help-option) for reference, or simply execute Maven with the `-h` (or `--help`) option:

```bash
mvn -h
```