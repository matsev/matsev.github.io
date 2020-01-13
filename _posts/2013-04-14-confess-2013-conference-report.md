---
title:  Confess 2013 Conference Report
categories: 
    - conference
    - events 
tags: 
    - architecture
    - conference
    - events
    - Java
---


co-authors: Johan Haleby, Jan Kronquist and Mads Enevoldsen 

The four of us recently visited the [Confess](https://2013.con-fess.com/), CONference For Enterprise Software Solutions, in Vienna. It was located at the [Messe Wien Exhibition & Congress Center](http://www.messecongress.at/) which was a nice place for the conference. Here's a summary of some of the sessions during the conference.


## Couchbase - Michael Nitschinger

Michael gave an overview of [Couchbase](http://www.couchbase.com/) and in particular the new features of the 2.0 version. Couchbase combines the features of an in-memory data grid and a document database with secondary indexes. What really got my attention was the addition of [view projections](http://www.couchbase.com/docs/couchbase-manual-2.0/couchbase-views.html) which can be used to make your queries faster. The projections are created asynchronously using map/reduce. Additionally, Michael mentioned that the largest cluster he was aware of was 30 nodes which processed 1 million transactions per second. Couchbase is definitely something worth a closer look!


## Offline Web Applications - David Tanzer

David talked about three main things needed for offline web applications:

*   Cache all resources on the client
    *   Use the [HTML cache manifest](https://developer.mozilla.org/en/docs/HTML/Using_the_application_cache)

*   Use the [IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB)
    *   Stores around 5-10 Mb of data
    *   Stores and retrieves Javascript objects
    *   Supports indexing and searching
    *   Asynchronous API

*   Implement synchronization mechanisms
    *   Clients must go online to sync
    *   No specification that describes how synchronization should work. This is up to you as a developer to take care of, for example using a 3-way merge or by applying events.


## Phaser and StampedLock Concurrency Synchronizers - Heinz Kabutz

Heinz started off describing a new synchronizer in Java 7 called [Phaser](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Phaser.html) which are compatible with the fork/join pool. Phasers are essentially a mix of a CyclicBarrier and CountDownLatch where the number of parties can change over time. Phasers can also have parents which means that you can structure them like a tree to reduce contention. Phasers also handles Interrupted Exceptions better than CyclicBarrier and CountDownLatch.

[StampedLock](http://download.java.net/jdk8/docs/api/java/util/concurrent/locks/StampedLock.html) is a new lock in Java 8 that allows for optimistic locking but it can be converted to a pessimistic lock on demand. This means that it has _much_ better performance than the standard ReadWriteLock available in Java today. An optimistic StampedLock can also be as much as a 1000 times faster than a pessimistic StampedLock. ReadWriteLocks have problems with starvations (Java 5 had problems with Write-starvation and Java 6 had problems with read-starvation). Idioms for the StampedLock are more difficult to get right than a ReadWriteLock. It's recommended to use synchronized methods and volatile fields in favor of StampedLock in most scenarios. Only use StampedLock if performance requires so!


## Big Data or Fast Data - Stephen Millidge

This presentation set out to look at and compare the capabilities of NoSQL databases and In-Memory Data Grids (IMDG). Stephen recommended us to look the three "V"s, Volume, Velocity, and Variety when he presented some general guidelines for choosing persistence solution:

*   Volume

    Volume or "Big Data". If we have lots of data, Petabytes or Terabytes according to Stephen or more according to Stephen, a NoSQL database is the preferred alternative because disk is cheap. On the other hand if you are dealing with less than 100 GB of data, Stephen suggested that IMDGs may be a good solution.

*   Velocity

    IMDGs are good for transient and near real-time data (~10 ms latency), operations that include key processing and small result and pushing notifications on certain state changes. Use-cases include financial risk calculation ("can I book this order?"), bet placement, hotel availability search, online product recommendations and alerts. NoSQL on the other hand are better for "write lots, read little" scenarios such as batch operations and periodic processing of large datavolumes. Examples include log analysis, packet- and event capturing, transactional analysis, SMS billing, patterns in social media groups etc.

*   Variety

    Both IMDGs and NoSQL store unstructured data. NoSQL is the preferred option for large data size like video. For use-cases based on single key retrieval such as content management, "get photo", personalization data, "get user info", or "get order by order id", Stephen claimed that IMDGs are typically faster, but the NoSQL solutions are generally good enough.


## Flyway - Axel Fontaine

Alex presented [Flyway](http://flywaydb.org/) which seem to be a really nice SQL database migration tool. By just providing [six commands](http://flywaydb.org/documentation/commandline/), they have really tried to enforce a minimal set of operations. Some nice features include:

*   Locking the database to prevent two migrations occurring at the same time
*   Using DDL transactions if the database supports them (eq Derby, Microsoft SQL Server & PostgreSQL)
*   Understand SQL scripts, ie just paste all SQL in a file and Flyway can execute it
*   Can be used as a Java API, Maven plugin and Ant task


## Modern Component Design with Spring 3 - Juergen Hoeller

Mostly an overview, but Juergen mentioned also mentioned some interesting details:

*   Spring MVC will use ASM support for reading parameter names, but this requires that you leave DEBUG information when compiling
*   [@Bean](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/context/annotation/Bean.html) can be used on method in any component to create new beans, that is not only on [@Configuration](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/context/annotation/Configuration.html)!
*   Many annotations in Spring support creating your own annotations, for example @Service, @Scope, @Bean, @Value, @Autowired
*   [@Primary](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/context/annotation/Primary.html) can be used when there are many possibilities for autowiring
*   A brief introduction to the features in the upcoming [Spring 4.0 release](http://blog.springsource.org/2013/01/16/next-stop-spring-framework-4-0/), such as Java 8 and Lambda support.


## The new Android Build System - Hans Dockter

[Gradle](http://www.gradle.org/) has gained a lot of attraction lately, both in the developer community, as well as among big companies like LinkedIn, Netflix, SpringSource and Google. Before going into details, Hans told us that new Android build system will consist of three parts, Gradle, Android Gradle Plugin and IDE integration.

One of the greatest features of Gradle is its incremental build system. In contrast to other build system like Ant or Maven, where you generally execute "clean" and rebuild the project from scratch, Gradle can calculate which steps of the build system that need to be executed if a file has changed. Gradle Wrapper is very good complement as it automatically downloads and installs the specified Gradle version for a specific project. In other words, if you check in a Gradle Wrapper as part of your version control system, only the JDK is required in order to build the project.

Interestingly, only three persons in the audience acknowledged that they were Android developers on a direct question from Hans, despite the fact that the session was titeled as an Android session.


## HTML-, CSS- and JavaScript techniques for mobile web applications - Stefan Schuster

Stefan started his talk by stating that it is likely that the mobile browser generally support new features quite well. People tend to buy new phones every odd year or so, and thus it is not unusual that the browsers in their pockets have better HTML 5 and CSS3 support than the desktop machine at their workplace. The [Mobile HTML 5](http://mobilehtml5.org/) site has a compatibility matrix for some popular phone models. Tips:

*   Viewport

    To control the layout of a page, the [viewport meta tag](https://developer.mozilla.org/en-US/docs/Mobile/Viewport_meta_tag) can be used to specify the width of the viewport. For example, the iPhone has a default viewport width of 980 px, but the real (logical) available width is just 320 px.

*   URL schemas

    URL schemas is the only app-to-app communication that is available on iPhone. Examples include `tel: +123 - 4 - 567890`, `sms: +123 - 4 - 567890` and `mailto: person@company.com`, but there are many more, visit the [handleOpenUrl](http://handleopenurl.com/) site to find out which URL schemas are available on iPhone. For Android, [Intents](http://developer.android.com/guide/components/intents-filters.html) are used for inter-app communication, but URL schemas are used for intent filters.

*   CSS3

    CSS3 provides a rich feature set for styling your web page. Use sites like [CSS3 Generator](http://css3generator.com/) can be used to aid you when decorating your DOM objects with RGBA, gradients, rounded corners, shadows, Webfonts, transformations, etc. Stefan noted that the CSS property `opacity` makes everything transparent, e.g. both the background and the text, and that the developer probably would like to use `RGBA` for "side effect free" transparency. Moreover, he mentioned that tools like [SASS](http://sass-lang.com/) or [LESS](http://lesscss.org/) when generating vendor specific properties like gradients or rounded corners.

*   Webfonts

    Some Webfonts are available at [Google Fonts](http://www.google.com/fonts/) and [iOS Fonts](http://iosfonts.com/)

*   Images

    Low resolution images that look good on older devices may look bad on new devices with high resolution displays. One solution could be to provide several images with different resolutions, but Stefan advised to use CSS instead of images whenever possible. Custom buttons is just one example that comes to mind. Executed correctly, a CSS rendered image will always be rendered to look good on the device. As a bonus, the performance will increase, since there will be less data sent.

*   JavaScript

    Stefan explained that classical mouse events such as `mouseclick` and `mouseover` will be simulated on a mobile device with various results. Usually, you will get a better result using [touch events](https://developer.mozilla.org/en-US/docs/DOM/Touch_events) like `touchstart` and `touchmove`, which also support multi-touch.

    There is the [orientationchange](https://developer.mozilla.org/en-US/docs/DOM/Mozilla_event_reference/orientationchange) event that one can subscribe to in order to find out when the device orientation changes between portrait and landscape mode.

    Alternatively, you can use the [deviceorientation](https://developer.mozilla.org/en-US/docs/DOM/Mozilla_event_reference/deviceorientation) to get notifications from the device's gyro or compass.
    
    Accelerometer changes can be detected by using the [devicemotion](https://developer.mozilla.org/en-US/docs/DOM/Mozilla_event_reference/devicemotion).

    Lastly, there is the [geolocation api](https://developer.mozilla.org/en-US/docs/WebAPI/Using_geolocation) that can be used for location queries and watching position. The accuracy of the geolocation depends on which technique is used by the device internally. GPS is the most accurate, but WLAN (IP address lookup) or cell tower positioning may be good enough.