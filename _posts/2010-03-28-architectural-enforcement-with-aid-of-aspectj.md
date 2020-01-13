---
title: Architectural Enforcement with Aid of AspectJ
categories:
    - architecture
    - Java
tags: 
    - aop
    - architecture
    - AspectJ
    - Java
    - Maven
---


After working some time within the software industry, you get a feeling for good software architecture. Or, to be more honest, you get a creeping feeling when the architecture is really bad. That is when the code is tangled like a Gordian knot. After some futile refactoring attempts, you consult the software architect at your company and you will be given a design document stating the architectural principles that should be obeyed during software development. It is a nifty piece of paper and you can tell by looking at it that someone has spent a lot of time working out how the software should be structured. The bad news is that it has little resemblance of the current state of the code base.

## Recipe

So how can you shape up the code? Yet better, how can you prevent that the code turns into spaghetti in the first place? One way of looking at architectural requirements is that they are crosscutting concerns that are scattered throughout the software. As such, they can be implemented and enforced by using AOP, [aspect-oriented programming](http://en.wikipedia.org/wiki/Aspect-oriented_programming). The recipe is pretty straight forward:

1.  Implement a pointcut that finds the violations of your architecture.
2.  Implement an advice that notifies you about the violations.
3.  Wrap the pointcut and the advice into an aspect.
4.  Refactor your code and exercise your aspect until all architectural violations have been removed.

## Example

This recipe of using aspects as a way of enforcing architectural rules can be applied in any kind of project, for example to enforce the MVC pattern, to separate one domain from another in a DDD project and so on. In this particular example, the application is based on a three layer architecture. The top layer being the GUI layer, the middle layer is the service layer and then there is the DAO layer in the bottom. 

![Architectural Enforcement](/assets/images/architectural-enforcement.png)

Each layer has a separate package, as stated below:
   

#### SomeGui.java

```java
package com.jayway.application.gui;

/** Simplistic GUI */
public interface SomeGui {

    /** Renders the GUI */
    void render();
}
```

#### SomeService.java

```java
package com.jayway.application.service;

/** Simplistic Service */
public interface SomeService {

    /** Executes some service */
    void service();
}
```

#### SomeDao.java

```java
package com.jayway.application.dao;

/** Simplistic DAO */
public interface SomeDao {

    /**
     * Finds something in the DAO
     * @return some data
     */
    public Object find();
}
```

### Architectural Rules

Four architectural rules have been defined:

1.  The GUI layer must not access the DAO layer
2.  The Service layer must not access the GUI layer
3.  The DAO layer must not access the Service layer
4.  The DAO layer must not access the GUI layer

These rules are the candidates for defining the pointcuts that should be implemented. An example of code that would violate the first rule is:

#### BadGuiImpl.java

```java
/**
 * Bad GUI implementation that violates the architectural rule
 * because it calls a method in the DAO layer
 */
public class BadGuiImpl implements SomeGui {

    private SomeService someService;
    private SomeDao someDao;

    @Override
    public void render() {
        // it is ok to use the service...
        someService.service();

        // ...but it is not ok to call the DAO directly
        someDao.find();

        // more rendering
    }
}
```

Using [AspectJ](http://eclipse.org/aspectj/), two pointcuts have been implemented to trap the violation. Additionally, AspectJ also provides the `@DeclareError` annotation that can be used for the advice implementation. Finally, an aspect that comprises the pointcuts and the advice has been created:

#### ArchitecturalEnforcement.java

```java
/**
 * The aspect that is responsible for architecture enforcement:
 * The GUI layer must not access the DAO layer.
 */
@Aspect
public class ArchitecturalEnforcement {

    /** Pointcut for finding join points inside the GUI layer */
    @Pointcut("within(*..*gui..*)")
    public void withinGui() {}

    /** Pointcut for finding method calls to the DAO layer */
    @Pointcut("call(* *..*.dao..*(..))")
    public void callDao(){}

    /** Advice that defines an error when a GUI method calls a method in the DAO layer */
    @DeclareError("withinGui() && callDao()")
    private static final String GUI_MUST_NOT_USE_DAO = "GUI must not access DAO";
}
```

### Exercise the Aspect

How should you use your aspects to enforce the architecture? Since we now have the tools to automate the architectural review, you should use them frequently. AspectJ has support for compile time weaving which means that the advices can be woven into their corresponding join points during source code compilation. The [aspectj-maven-plugin](http://mojo.codehaus.org/aspectj-maven-plugin/) can do it for you:

#### pom.xml

```xml
<dependencies>
    <dependency>
        <groupid>org.aspectj</groupid>
        <artifactid>aspectjrt</artifactid>
        <version>1.6.7</version>
    </dependency>
</dependencies>
    ...
<build>
    <plugins>
        <plugin>
            <groupid>org.codehaus.mojo</groupid>
            <artifactid>aspectj-maven-plugin</artifactid>
            <version>1.3</version>
            <configuration>
                <compliancelevel>1.6</compliancelevel>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>compile</goal>   <!-- Weaves the main classes -->
                        <goal>test-compile</goal>   <!-- Weaves the test classes -->
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### Result

If you have put everything together correctly, you will find that you will get a compile time error when you attempt to execute `mvn compile`:

```bash
[[INFO] [aspectj:compile {execution: default}]
[ERROR] "GUI must not access DAO"
[INFO] ------------------------------------------------------------------------
[ERROR] BUILD ERROR
[INFO] ------------------------------------------------------------------------
[INFO] Compiler errors:
error at someDao.find();
^^^^^^^^^^^^^^
/home/mattias/architectural-enforcement/src/main/java/com/jayway/application/gui/BadGuiImpl.java:20:0::0 "GUI must not access DAO"
	see also: /home/mattias/architectural-enforcement/src/main/java/com/jayway/application/aspects/ArchitecturalEnforcement.java:1::0
```

You can also see the error in your Eclipse IDE if you are using the [AJDT - AspectJ Development Tools](http://www.eclipse.org/ajdt/) plugin: 

![Eclipse Screenshot](/assets/images/eclipse-screenshot.png) 

Notably, the implementation above was just one of the stated rules. The implementation of all four rules together with some examples that break them and the Maven pom file are available for [download](/assets/bin/architectural-enforcement.zip) for your convenience.

## Considerations

There are some things that you may want to consider before introducing aspects as a tool for automated architectural enforcement:

*   ### Error or Warning
    
    A compile time error is a powerful tool that prevents the developer to commit any code that does not conform to the architectural rules (presumed, of course, that the code is actually compiled before being checked in). A less brutal way of introducing aspects as a part of architectural review is to use the `@DeclareWarning` annotation rather than the `@DeclareError` that was used in the example. Consequently, any architectural offenders will be punished with a compiler warning rather than a compiler error.
*   ### Performance
    
    The compile time will increase when you add more architectural rules that should be obeyed, that is when you add more pointcuts. Likewise, the compile time will also increase when your code base grows, because of the increasing number of join points in the code. By limiting the `aspectj-maven-plugin` to certain maven profiles, the developers only have to verify that their particular module conforms to the rules. Alternatively, all modules can be verified by the integration server during nightly builds. The drawback is that the advantage of having the architecture enforced _before_ the code is committed to the version control system will be lost.
*   ### Limitation
    
    The aspect above can only trap architectural violations when a method is being _called_. Regrettably, any _unused declaration_ that would violate the architecture will pass unnoticed:
    
    #### AnotherBadGuiImpl.java
    
    ```java
    package com.jayway.application.gui;
    
    import com.jayway.application.dao.SomeDao;
    
    /**
     * Another bad GUI implementation that violates the architectural rule
     * because it has references to the DAO layer.
     * However, these errors will remain undetected by AspectJ.
     */
    public class AnotherBadGuiImpl implements SomeGui {
    
        /** Unused DAO reference */
        private SomeDao someDao;
    
        /**
         * Setter method that for some obscure reason adds a DAO to the GUI
         * @param someDao A DAO reference that is not found by the pointcut
         */
        public void setDao(SomeDao someDao) {
            this.someDao = someDao;
        }
    
        @Override
        public void render() {
            // valid gui rendering that does not use the dao reference
        }
    }
    ```

    One solution is to create another pointcut, such as `@Pointcut("set(*..*.*dao*..* *)")`, that traps the assignment of the `someDao` member variable.

## Wrap Up

Education of the developers and repeated manual code reviews have been the traditional ways of improving software architecture. Unfortunately, it is not good enough. It is always a good idea to have skilled employees, but even experts do make mistakes. After all, people that manually review code are only humans, which implies that the reviews are resource demanding, yet error prone. With the powerful tools of today's IDEs it is very easy to do refactoring hastily and soon the code starts to degrade. With a proper implementation, AspectJ offers one way to automate architectural enforcement, hereby preventing architectural drift.

## Edit

2010-04-16: Added screenshot of AJDT plugin and an example of how the "set" pointcut can be used.