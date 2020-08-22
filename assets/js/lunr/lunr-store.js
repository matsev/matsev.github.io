var store = [{
        "title": "Øredev 2007",
        "excerpt":"co-authors: Jakob Klamra and Stefan Li As most of you know Jayway is one of the organizers of Øredev. Knowing that, and knowing how much we love our own conference, you might not trust our judgment in this review. We beg to differ, and ensure you that Øredev is just...","categories": ["conference","events"],
        "tags": ["conference","events"],
        "url": "https://matsev.github.io/blog/2008/02/01/oredev-2007/",
        "teaser": null
      },{
        "title": "Getting Started with JavaME jUnit Testing",
        "excerpt":"Introduction Unit testing is a very powerful tool that should be included in every developer’s toolbox. Unfortunately, this has not always been the case, especially not among MIDlet developers. One reason is that JavaME projects usually are small (compared to Java SE projects), which implies that manual testing could be...","categories": ["embedded","Java","testing"],
        "tags": ["Java ME","jUnit","mock","PowerMock"],
        "url": "https://matsev.github.io/blog/2009/03/22/getting-started-with-javame-junit-testing/",
        "teaser": null
      },{
        "title": "How to mock MIDP RecordStore",
        "excerpt":"Challenge PowerMock is a mocking framework that claims to have almost supernatural powers. According to its documentation it is able to mock both static and private methods, final classes, and other nasty things that would be insurmountable obstacles for other mock frameworks. As a result, it has been stated that...","categories": ["embedded","Java","testing"],
        "tags": ["Java","Java ME","jUnit","mock","PowerMock"],
        "url": "https://matsev.github.io/blog/2009/03/22/how-to-mock-midp-recordstore/",
        "teaser": null
      },{
        "title": "Architectural Enforcement with Aid of AspectJ",
        "excerpt":"After working some time within the software industry, you get a feeling for good software architecture. Or, to be more honest, you get a creeping feeling when the architecture is really bad. That is when the code is tangled like a Gordian knot. After some futile refactoring attempts, you consult...","categories": ["architecture","Java"],
        "tags": ["aop","architecture","AspectJ","Java","Maven"],
        "url": "https://matsev.github.io/blog/2010/03/28/architectural-enforcement-with-aid-of-aspectj/",
        "teaser": null
      },{
        "title": "Dynamic FTP Client using Apache Camel and Spring",
        "excerpt":"I was recently asked to develop an FTP client that could transmit files to various FTP servers as a part of a delivery system in a Java enterprise application. The requirements dictated a flexible implementation: Three different FTP protocols should be supported, namely FTP, FTPS and SFTP It should be...","categories": ["Java"],
        "tags": ["Apache Camel","FTP","integration","Java","Spring"],
        "url": "https://matsev.github.io/blog/2010/08/12/dynamic-ftp-client-using-apache-camel-and-spring/",
        "teaser": null
      },{
        "title": "IntelliJ IDEA performance improvement",
        "excerpt":"Working as a consultant, it is not unusual that I am referred to customer specific software environment with regard to computers, operating systems, networks and other configurations. However, since I work with Java, most tools are available online and they can easily be downloaded and installed on different platforms. IntelliJ...","categories": ["Java","tools"],
        "tags": ["Idea","IntelliJ","Java","performance","tools"],
        "url": "https://matsev.github.io/blog/2011/09/26/intellij-idea-performance-improvement/",
        "teaser": null
      },{
        "title": "Spring Integration Tests, Part I, Creating Mock Objects",
        "excerpt":"When writing integration tests with Spring, it can sometimes be convenient to mock one or more of Spring bean dependencies. However, during some circumstances strange things may happen… (In this post, Mockito has been used for creating mock objects, but the same problem applies to EasyMock as well. You can...","categories": ["Java","testing"],
        "tags": ["EasyMock","factory-method","factorybean","Java","Mockito","Spring","testing"],
        "url": "https://matsev.github.io/blog/2011/11/30/spring-integration-tests-part-i-creating-mock-objects/",
        "teaser": null
      },{
        "title": "Spring Integration Tests, Part II, Using Mock Objects",
        "excerpt":"In the previous post, I wrote how you can use Spring’s FactoryBean to facilitate the creation of mock objects for Spring integration tests. Now, it is time to use the EasyMockFactoryBean (in this post EasyMock has been used for creating mock objects, but a similar approach applies to Mockito as...","categories": ["Java","testing"],
        "tags": ["EasyMock","Java","mock","Mockito","Spring","testing"],
        "url": "https://matsev.github.io/blog/2011/12/12/spring-integration-tests-part-ii-using-mock-objects/",
        "teaser": null
      },{
        "title": "Mockito and Dependency Injection",
        "excerpt":"When writing your Java unit test you will soon need a way to handle the dependencies of your classes under test. Mockito have some nice features that simplify the creation and usage of mock objects that have improved gradually during the last couple of years. Class under test Imagine that...","categories": ["Java","testing"],
        "tags": ["dependency injection","testing","Java","Java EE","jUnit","mock","Mockito","Spring","testing"],
        "url": "https://matsev.github.io/blog/2012/02/25/mockito-and-dependency-injection/",
        "teaser": null
      },{
        "title": "Continuous Deployment, Versioning and Git",
        "excerpt":"So you have heard about continuous delivery and continuous deployment and you are eager to try, but your manager is afraid that you will lose traceability of the project. How can frequent updates of your binaries be tracked in a rapidly progressive environment, where every commit is a potential release?...","categories": ["CI/CD","Java"],
        "tags": ["CI/CD","Git","Java","Maven","Spring","version control"],
        "url": "https://matsev.github.io/blog/2012/04/07/continuous-deployment-versioning-and-git/",
        "teaser": null
      },{
        "title": "Spring Controller Tests 2.0",
        "excerpt":"Spring has many tools in the toolbox to facilitate testing. However, when it comes to testing a Controller, the tools have been a bit blunt. To make life easier, Sam Brennan and Rossen Stoyanchev presented the spring-test-mvc framework during a session at SpringOne 2GX last year. It provides a Java...","categories": ["Java","testing"],
        "tags": ["Java","Mockito","REST","Spring","testing"],
        "url": "https://matsev.github.io/blog/2012/09/08/spring-controller-tests-20/",
        "teaser": null
      },{
        "title": "Improve Your Spring REST API, Part I",
        "excerpt":"After watching Jonathan Dahl’s presentation about API design from the Øredev conference last year, especially the parts about Smart Validations, it is apparent that you can do much more to help your client developers than just returning HTTP status code 500 - Internal Server Error, when a request to your...","categories": ["Java","web"],
        "tags": ["HTTP","Java","REST","Spring","web"],
        "url": "https://matsev.github.io/blog/2012/09/16/improve-your-spring-rest-api-part-i/",
        "teaser": null
      },{
        "title": "Improve Your Spring REST API, Part II",
        "excerpt":"In the previous blog post, I explained how a custom @ExceptionHandler can be used to return feedback to REST API clients when they are submitting erroneous requests. However, the suggested implementation does not scale, because an @ExceptionHandler method is only applicable for a specific controller. In a real project, it...","categories": ["Java","web"],
        "tags": ["HTTP","Java","REST","Spring","web"],
        "url": "https://matsev.github.io/blog/2012/09/23/improve-your-spring-rest-api-part-ii/",
        "teaser": null
      },{
        "title": "Improve Your Spring REST API, Part III",
        "excerpt":"Some time ago, I wrote about how the error response of a Spring based REST API can be enhanced, in order to provide the clients with a better understanding of why a request error occurred. In the first post I explained how a server-side exception triggered by an incoming request...","categories": ["Java","web"],
        "tags": ["HTTP","Java","REST","Spring","web"],
        "url": "https://matsev.github.io/blog/2013/02/03/improve-your-spring-rest-api-part-iii/",
        "teaser": null
      },{
        "title": "Scandinavian Developer Conference Report",
        "excerpt":"co-authors: Johan Haleby and Jan Kronquist The three of us recently visited Scandinavian Developer Conference in Gothenburg. The location (Svenska Mässan) is huge and we actually got lost on the first day trying to find the conference! However, having a large restaurant and being served at the table during lunch...","categories": ["conference","events"],
        "tags": ["architecture","conference","DevOps","events"],
        "url": "https://matsev.github.io/blog/2013/03/07/scandinavian-developer-conference-report/",
        "teaser": null
      },{
        "title": "Confess 2013 Conference Report",
        "excerpt":"co-authors: Johan Haleby, Jan Kronquist and Mads Enevoldsen The four of us recently visited the Confess, CONference For Enterprise Software Solutions, in Vienna. It was located at the Messe Wien Exhibition &amp; Congress Center which was a nice place for the conference. Here’s a summary of some of the sessions...","categories": ["conference","events"],
        "tags": ["architecture","conference","events","Java"],
        "url": "https://matsev.github.io/blog/2013/04/14/confess-2013-conference-report/",
        "teaser": null
      },{
        "title": "Getting Started with Gradle",
        "excerpt":"Did you know that there is a Java build system that does not use angle brackets? More and more projects are using Gradle as an integrated part of their development process. In short, Gradle provides a Groovy DSL for declarative builds based on build conventions. This blog post aims to...","categories": ["Java","tools"],
        "tags": ["build systems","Gradle","Java","tools"],
        "url": "https://matsev.github.io/blog/2013/05/12/getting-started-with-gradle/",
        "teaser": null
      },{
        "title": "Working Efficiently with Maven Modules",
        "excerpt":"When working with Java you will sooner or later come across Maven and Maven modules. Before you start developing a new module feature, upstream modules need to be built, and before you finish you must build downstream modules to make sure that you have not broken any dependencies or tests....","categories": ["Java","tools"],
        "tags": ["build systems","Java","Maven","tools"],
        "url": "https://matsev.github.io/blog/2013/06/09/working-efficiently-with-maven-modules/",
        "teaser": null
      },{
        "title": "SpringOne 2GX 2013",
        "excerpt":"Last week, I had the privilege of speaking at SpringOne 2GX in Santa Clara. As the name implies, the conference was focused around Spring, Groovy and Grails. The conference tagline was “The Spring Groovy, Grails &amp; Cloud Event of the Year!”, and I must admit that resonates well my personal...","categories": ["conference","events","Java"],
        "tags": ["conference","events","Java","Spring"],
        "url": "https://matsev.github.io/blog/2013/09/19/springone-2gx-2013/",
        "teaser": null
      },{
        "title": "Improve Your Spring REST API, Part IV",
        "excerpt":"Spring 4 is around the corner. Milestone releases has been available for a while, the first release candidate was released earlier today, and the final release is expected before the end of this year. @RestController One new feature that has been added is the @RestController annotation, which provide some syntactic...","categories": ["Java","web"],
        "tags": ["HTTP","Java","REST","Spring","web"],
        "url": "https://matsev.github.io/blog/2013/10/31/improve-your-spring-rest-api-part-iv/",
        "teaser": null
      },{
        "title": "Spring and Autowiring of Generic Types",
        "excerpt":"Spring 4 brings some nice improvements to how autowiring of generic types are handled. Before going into details, let’s look into the current state of affairs. Basics Consider the following example where you have one generic interface: interface GenericDao&lt;T&gt; { // ... } And two concrete implementations of it: @Repository...","categories": ["Java"],
        "tags": ["Java","Spring"],
        "url": "https://matsev.github.io/blog/2013/11/03/spring-and-autowiring-of-generic-types/",
        "teaser": null
      },{
        "title": "Spring @PropertySource",
        "excerpt":"If you are a Spring developer and and you have created a Java based container configuration, you have probably come across the @PropertySource annotation for importing resources. It was first added as part of Spring 3.1, but Spring 4 has added some welcome improvements. Basics Let’s start with a simple...","categories": ["Java"],
        "tags": ["Java","Spring"],
        "url": "https://matsev.github.io/blog/2014/02/16/spring-propertysource/",
        "teaser": null
      },{
        "title": "About ExecutorServices",
        "excerpt":"Dealing with asynchronous programming is not easy, at least not if you are a Java programmer. Not only do you have to take care of Callables, Runnables, Futures and likes, you also need to configure the details of how they should be executed by providing an ExecutorService. The Executors class...","categories": ["Java","concurrency"],
        "tags": ["asynchronous","concurrency","Java","threading"],
        "url": "https://matsev.github.io/blog/2014/03/06/about-executorservices/",
        "teaser": null
      },{
        "title": "GeeCON 2014",
        "excerpt":"co-author: Johan Haleby Last week we visited the GeeCON conference in Krakow as speakers and participants. The event attracted some 1200 visitors according to the organizers, and it was located inside a cinema complex a few kilometers from the city centre, which means nice chairs and a large screens. In...","categories": ["conference","events","Java"],
        "tags": ["conference","events","Java"],
        "url": "https://matsev.github.io/blog/2014/05/24/geecon-2014/",
        "teaser": null
      },{
        "title": "Integration Testing a Spring Boot Application",
        "excerpt":"Spring Boot brings about some welcome defaults configurations that significantly decreases the development time of Spring projects. It also has some useful additions when it comes to simplified integration testing. Traditionally, one would use the build script to fire up an embedded container such as Jetty, Tomcat or Cargo, but...","categories": ["Java","testing","web"],
        "tags": ["Java","REST","Rest Assured","Spring","Spring Boot","testing","web"],
        "url": "https://matsev.github.io/blog/2014/07/04/integration-testing-a-spring-boot-application/",
        "teaser": null
      },{
        "title": "Spring Boot Custom HealthIndicator",
        "excerpt":"A big part of the DevOps responsibilities is to monitor and maintain the health of running servers. If a production server goes down, appropriate actions must be undertaken to bring the service back to life. However, before any resurrection, one must know that the server is malfunctioning in the first...","categories": ["DevOps","Java","web"],
        "tags": ["DevOps","Java","Spring","Spring Boot","web"],
        "url": "https://matsev.github.io/blog/2014/07/22/spring-boot-custom-healthindicator/",
        "teaser": null
      },{
        "title": "Asynchronous Spring Service",
        "excerpt":"It is not unusual that your web service needs to communicate with another web service in order to serve its clients. In the old days, that would imply that an incoming request to your server would capture one servlet connection, and perform a blocking call to the remote service before...","categories": ["Java","web"],
        "tags": ["asynchronous","Java","Spring","Spring Boot","web"],
        "url": "https://matsev.github.io/blog/2014/09/09/asynchronous-spring-service/",
        "teaser": null
      },{
        "title": "Spring Boot Error Responses",
        "excerpt":"I have written about Spring’s support for web response error handling a few times before (e.g. about custom error responses and how they can be generalized. This time, we will take a look at what Spring Boot has to offer. Start by creating a simple controller: @RestController class PersonController {...","categories": ["Java","web"],
        "tags": ["HTTP","Java","REST","Spring","Spring Boot","web"],
        "url": "https://matsev.github.io/blog/2014/10/19/spring-boot-error-responses/",
        "teaser": null
      },{
        "title": "jUnit @Rule and Spring Caches",
        "excerpt":"If you have worked a while with jUnit you may have seen jUnit Rules. Simply put, a field in a test class annotated with @Rule is a class that lets you execute some code that runs before and/or after your unit test, similar to the @Before and @After annotations. Consequently,...","categories": ["Java","testing"],
        "tags": ["Java","jUnit","Spring","Spring Boot","testing"],
        "url": "https://matsev.github.io/blog/2014/12/07/junit-rule-and-spring-caches/",
        "teaser": null
      },{
        "title": "Scaling Out with Spring Session",
        "excerpt":"Stateless architecture has become increasingly popular during resent years and for good reasons. However, stateful session based applications continue to play an important role, for example when issuing CSRF tokens for improved security. When deployed on a single server with little load, session management is pretty straight forward as long...","categories": ["Java","web"],
        "tags": ["HTTP","HTTP Session","Java","Redis","Servlet","Spring","Spring Session","web"],
        "url": "https://matsev.github.io/blog/2015/05/31/scaling-out-with-spring-session/",
        "teaser": null
      },{
        "title": "Reusing Spring Boot's Dependency Management",
        "excerpt":"If you develop a Spring Boot application and are using Gradle, you have already used the Spring Boot Gradle plugin. It serves several different purposes such as packaging your project to an executable jar (or war) file, executing the project and it also takes care of version management of third...","categories": ["Java","tools"],
        "tags": ["dependency management","Gradle","Java","Spring Boot","tools"],
        "url": "https://matsev.github.io/blog/2015/11/23/reusing-spring-boots-dependency-management/",
        "teaser": null
      },{
        "title": "Working Efficiently with Gradle Modules",
        "excerpt":"Gradle has the ability to check if a task is up to date and more importantly skip the task if it finds that the task input is unchanged compared to the latest build. This feature results in significant build time reductions, but as we will see in this blog post...","categories": ["Java","tools"],
        "tags": ["dependency management","Gradle","Java","tools"],
        "url": "https://matsev.github.io/blog/2015/12/06/working-efficiently-with-gradle-modules/",
        "teaser": null
      },{
        "title": "Custom Resource for Generating Lambdas",
        "excerpt":"AWS Lambda enables you to quickly setup a backend solution for your mobile application. AWS CloudFormation allows you to create templates for your infrastructure that can be versioned controlled. When used together, the CloudFormation API provides AWS::Lambda::Function for creating Lambdas, however the API does not allow you to specify the...","categories": ["cloud","JavaScript"],
        "tags": ["AWS","cloud","CloudFormation","Custom Resources","Lambda","Node.js"],
        "url": "https://matsev.github.io/blog/2016/03/03/custom-resource-for-generating-lambdas/",
        "teaser": null
      },{
        "title": "Route53 Configuration for Elastic Beanstalk",
        "excerpt":"The AWS documentation is extensive, yet I find it both incomprehensible and overwhelming from time to time. Recently, I struggled to configure a HostedZoneId in a Route53 AliasTarget targeting an Elastic Beanstalk environment using CloudFormation. Challenge I had an ElasticBeanstalk environment with an ELB (such as the Elastic Beanstalk Node.js...","categories": ["cloud"],
        "tags": ["AWS","Beanstalk","cloud","CloudFormation","Route53"],
        "url": "https://matsev.github.io/blog/2016/06/02/route53-configuration-for-elastic-beanstalk/",
        "teaser": null
      },{
        "title": "Continuous Deployment on AWS Lambda",
        "excerpt":"The quickest way of pushing every code change to production is to use automation, but to do that in a safe and sustainable way also requires test automation. The goal of this blog post is to create a set of bash scripts for automating each part of Continuous Deployment pipeline...","categories": ["CI/CD","cloud","DevOps"],
        "tags": ["AWS","bash","CI/CD","cloud","CloudFormation","DevOps","Lambda","Node.js","serverless"],
        "url": "https://matsev.github.io/blog/2016/07/07/continuous-deployment-on-aws-lambda/",
        "teaser": null
      },{
        "title": "Introduction to CloudFormation for API Gateway",
        "excerpt":"AWS API Gateway and AWS Lambda are part of the Serverless Architecture paradigm shift. The learning curve is steep and for this reason Amazon has a step-by-step tutorial on how to get started. This blog post aims to outline the required AWS resources for a similar project, but this time...","categories": ["cloud"],
        "tags": ["API Gateway","AWS","cloud","CloudFormation","Lambda","serverless"],
        "url": "https://matsev.github.io/blog/2016/08/17/introduction-to-cloudformation-for-api-gateway/",
        "teaser": null
      },{
        "title": "Continuous Deployment of AWS Lambda behind API Gateway",
        "excerpt":"In two previous blog posts I started by introducing scripts for Continuous Deployment on AWS Lambda and then I continued to experiment with Introduction to CloudFormation for API Gateway. This blog post will be a continuation of both of them. You will see an example of how continuous deployment of...","categories": ["cloud","DevOps","testing"],
        "tags": ["API Gateway","AWS","bash","CI/CD","cloud","CloudFormation","DevOps","Lambda","serverless"],
        "url": "https://matsev.github.io/blog/2016/09/07/continuous-deployment-of-aws-lambda-behind-api-gateway/",
        "teaser": null
      },{
        "title": "Introduction to Swagger for CloudFormation and API Gateway",
        "excerpt":"When I was writing my previous blog post about Introduction to CloudFormation for API Gateway, I noticed that CloudFormation also supports Swagger for API Gateway configuration. Curious about what such an implementation would look like in comparison to the previous solution, I decided to give it a go. Like the...","categories": ["cloud","DevOps","tools"],
        "tags": ["API Gateway","AWS","cloud","CloudFormation","DevOps","Lambda","serverless","Swagger"],
        "url": "https://matsev.github.io/blog/2016/09/18/introduction-to-swagger-for-cloudformation-and-api-gateway/",
        "teaser": null
      },{
        "title": "Introduction to Claudia.js",
        "excerpt":"Serverless architecture and serverless applications are rapidly gaining momentum. In a couple of previous blog posts I have showed simple examples of how RESTful APIs can be deployed using AWS API Gateway and AWS Lambda. In one blog post CloudFormation’s native resources were used to create the entire stack, including...","categories": ["cloud","JavaScript"],
        "tags": ["API Gateway","AWS","cloud","Cloudia.js","JavaScript","Lambda","Node.js","serverless"],
        "url": "https://matsev.github.io/blog/2016/11/06/introduction-to-claudia-js/",
        "teaser": null
      },{
        "title": "AWS CLI MFA",
        "excerpt":"AWS CLI MFA, how about that for title? It translates to Amazon Web Services Command Line Interface Multi Factor Authentication when all acronyms are spelled out. If you have enabled MFA for the AWS Console you may know that is fairly straight forward once you have created your IAM user,...","categories": ["cloud","security","tools"],
        "tags": ["AWS","CLI","cloud","CloudFormation","MFA","security"],
        "url": "https://matsev.github.io/blog/2017/11/22/aws-cli-mfa/",
        "teaser": null
      },{
        "title": "AWS Glue Dev Endpoint Deleter",
        "excerpt":"Development of AWS Glue scripts can potentially add unnecessary expenses to your invoice if you are not careful. This blog post shows one way to avoid some of the cost in an automated fashion by using AWS CloudFormation and AWS Lambda. Background A while ago, I had the opportunity to...","categories": ["cloud","tools"],
        "tags": ["AWS","AWS Glue","cloud","CloudFormation","Lambda"],
        "url": "https://matsev.github.io/blog/2018/07/03/aws-glue-dev-endpoint-deleter/",
        "teaser": null
      },{
        "title": "AWS Elasticsearch JavaScript Client",
        "excerpt":"I have spent some time working with the AWS Elasticsearch Service lately. Regrettably, I found the threshold before being productive was higher than I anticipated. One of my obstacles was to get an AWS Elasticsearch JavaScript client working inside an AWS Lambda function, so I thought I’d better make a...","categories": ["cloud","JavaScript"],
        "tags": ["AWS","cloud","Elasticsearch","JavaScript","Lambda"],
        "url": "https://matsev.github.io/blog/2018/09/11/aws-elasticsearch-javascript-client/",
        "teaser": null
      },{
        "title": "AWS CDK MFA",
        "excerpt":"The AWS CDK (Cloud Development Kit) is a welcome contribution to the “Infrastructure as Code” family. It is a development framework that allows you to configure AWS resources using programming languages like TypeScript, JavaScript, Java, Python and C#. In this post, I will present how you can improve the security...","categories": ["cloud","JavaScript","security"],
        "tags": ["AWS","AWS CDK","cloud","JavaScript","MFA","security"],
        "url": "https://matsev.github.io/blog/2020/03/23/aws-cdk-mfa/",
        "teaser": null
      }]
