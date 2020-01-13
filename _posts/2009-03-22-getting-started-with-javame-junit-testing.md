---
title: Getting Started with JavaME jUnit Testing
categories: 
    - embedded
    - Java
    - testing
tags:
    - Java ME
    - jUnit
    - mock
    - PowerMock
---


### Introduction

Unit testing is a very powerful tool that should be included in every developer's toolbox. Unfortunately, this has not always been the case, especially not among MIDlet developers. One reason is that JavaME projects usually are small (compared to Java SE projects), which implies that manual testing could be enough. However, as soon as you start developing production code you really should consider to automate your tests by developing your own test suite. Some of you may have played around with [JMUnit](http://sourceforge.net/projects/jmunit) project. It is a nice framework that allows you to write tests that can be transferred to your phone or emulator and you will see the test result on the display. Alternatively, the tests can be executed by Ant. Still, there are some limitations that you cannot bypass:

*   Because of CLDC's lack of reflection, you cannot benefit from the powers of [jUnit 4.x](http://www.junit.org/).
*   You cannot create mock objects. This means that if a class has dependencies to other classes you will perform an integration test rather than a _unit_ test.
*   The turn around time for test, debug and retest, is significantly larger compared to Java SE unit testing, especially if you are executing the test on the phone.

No offence to the JMUnit guys, they are restricted by the limitations of the CLDC VM and the fact that you need a target device (a phone or an emulator) to run the tests on. But maybe there is a workaround to solve these problems? With some tricks, it is possible to unit test your JavaME code in the same way as you would unit test your Java SE code. In other words, you can execute the tests _on the PC side without deploying the tests to an emulator or a phone_.

### PowerMock

One part of the solution is to mock any platform dependencies. Previously, it was an awkward job to do, but the introduction of [PowerMock](http://code.google.com/p/powermock/) allows us to mock the many static methods in MIDP and CLDC. The easiest way to get started with powermock is to download the [powermock-1.2-with-dependencies.zip](http://code.google.com/p/powermock/downloads/list). In another [post]({% post_url 2009-03-22-how-to-mock-midp-recordstore %}) I have explained how PowerMock can be used to mock the RecordStore in MIDP.

### Project configuration

If you are using Eclipse, you need two projects, one for your phone application and the other your test code. This is because different projects can have different java compiler settings.

*   Create a _MIDlet_ project. This is your phone application. Make sure that the "Java Compiler" compliance level is "1.3".
*   Create a _Java_ project. This is the test project where you will write your tests. Make sure that the "Java Compiler" compliance level is set to "1.6" (or to whatever JDK version you have installed).
    *   Add the midlet project you just created to "Required projects" in the "Java Build Path" setting.
    *   Add the PowerMock jar files and their dependencies to "Libraries" in the "Java Build Path" setting.

In the MIDlet project, you write your application code and in the java test project you write your java jUnit tests. Normal package protection rules apply, so you should consider to reuse the package name from the class in the midlet project you would like to test when you are writing the test class in the java project.

### Automation

Naturally, it is possible to automate the test by using build tools. Here is an example using of an Ant build.xml file:

```xml
<!--?xml version="1.0" encoding="UTF-8"?-->
<project name="Example" default="test" basedir=".">

	<property name="midlet.project.home" value="C:/your_workspace/MidletProject">
	<property name="test.project.home" value="C:/your_workspace/MidletProjectTest">
	<property name="powermock.home" value="C:/your_path/powermock-1.2">
	<property name="wtk.home" value="C:/WTK2.5.2">
	<property name="src.dir" value="${midlet.project.home}/src">
	<property name="test.src.dir" value="${test.project.home}/src">
	<property name="bin.dir" value="classes">
	<property name="test.bin.dir" value="test-classes">
	<property name="test.result.dir" value="test-result">

	<path id="midlet.dependencies">
		<fileset dir="${wtk.home}/lib">
			<include name="*.jar">
		</include></fileset>
	</path>

	<path id="test.dependencies">
		<pathelement location="${bin.dir}">
		<path refid="midlet.dependencies">
		<fileset dir="${powermock.home}">
	</fileset></path>

	<target name="clean">
		<delete dir="${bin.dir}">
		<delete dir="${test.bin.dir}">
		<delete dir="${test.result.dir}">
	</delete></delete></delete></target>

	<target name="compile">
		<mkdir dir="${bin.dir}">
		<javac srcdir="${src.dir}" destdir="${bin.dir}" source="1.3" target="1.1" classpathref="midlet.dependencies">
	</javac></mkdir></target>

	<target name="compile-tests" depends="compile">
		<mkdir dir="${test.bin.dir}">
		<javac srcdir="${test.src.dir}" destdir="${test.bin.dir}" classpathref="test.dependencies">
	</javac></mkdir></target>

	<target name="test" depends="clean, compile-tests">
		<mkdir dir="${test.result.dir}">
		<junit printsummary="yes">
			<classpath refid="test.dependencies">
			<classpath path="${test.bin.dir}">
			<formatter type="plain">
			<batchtest fork="yes" todir="${test.result.dir}">
				<fileset dir="${test.src.dir}">
			</fileset></batchtest>
		</formatter></classpath></classpath></junit>
	</mkdir></target>

</pathelement></path></property></property></property></property></property></property></property></property></property></project>
```

Now your project configuration is setup and you can test your MIDlet code in the same way as you would test your Java SE code.

### What's next?

If you are a dedicated MIDlet developer you would probably like to add more build targets later on to preverify, obfuscate, sign, package and deploy your MIDlet. You should also consider using a continuous integration server together with your version control system and configure it to run your test suite whenever the code has been changed. Depending on the server you choose, you may also find that it may be used to present result from static code analysis tools, code coverage, code metrics and so on.