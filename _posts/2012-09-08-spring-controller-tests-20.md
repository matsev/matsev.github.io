---
title: Spring Controller Tests 2.0
categories:
    - Java 
    - testing
tags:
    - Java
    - Mockito
    - REST
    - Spring
    - testing
---


Spring has many tools in the toolbox to facilitate testing. However, when it comes to testing a Controller, the tools have been a bit blunt. To make life easier, Sam Brennan and Rossen Stoyanchev presented the [spring-test-mvc](https://github.com/SpringSource/spring-test-mvc) framework during a session at [SpringOne 2GX](http://www.infoq.com/presentations/Spring-3-1-and-MVC-Testing-Support) last year. It provides a Java DSL that enables white box Controller testing of request mappings, response codes, type conversions, redirects, view resolutions, and more. This post will briefly introduce how a Spring powered REST Controller test may be implemented when written as a standalone test with Mockito used as mocking framework.

## Example Controller

Let's assume that you have a simple `UserController` class with just a single method: 

```java
@Controller
@RequestMapping("/user")
class UserController {
    private final UserService userService;

    @Autowired
    UserController(UserService userService) {
        this.userService = userService;
    }

    @RequestMapping(value = "/{userId}",
            method = RequestMethod.GET,
            produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
    @ResponseBody
    User getUser(@PathVariable("userId") long userId) {
        return userService.getById(userId);
    }
}
```

As can be seen, the `getUser(long userId)` method is mapped to GET requests of the `/user/{userId}` URL. When a request is executed, the method fetches information about a `User` from the `UserService` and serializes the result to JSON or XML depending on the accept header of the request.

## Test

We start by verifying that we can fetch a user serialized to JSON. In plain English, we would like the following test: Perform a GET request to /user/0 with JSON as accepted media type, then expect the status code to be ok, the content type of the response to be of type JSON, the response body to have an expected "name" key/value pair and an expected "email" key/value pair. Compare with spring-mvc-test implementation below:

```java
@Test
public void shouldGetTestUserAsJson() throws Exception {
    mockMvc
            .perform(get("/user/0")
                    .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("name", is("Test User")))
            .andExpect(jsonPath("email", is("test.user@somewhere.com")));
}
```

## Setup

In order for the test to work, we need to create a setup method: 

```java
@Before
public void setUp() {
    userServiceMock = mock(UserService.class);
    UserController userController = new UserController(userServiceMock);
    testUser = new User("Test User", "test.user@somewhere.com");
    when(userServiceMock.getById(0)).thenReturn(testUser);

    mockMvc = MockMvcBuilders
            .standaloneSetup(userController)
            .build();
}
```

The first few lines should be familiar to all Mockito users. Basically, a `UserService` instance is created by calling the [Mockito.mock(Class classToMock)](http://docs.mockito.googlecode.com/hg/org/mockito/Mockito.html#mock(java.lang.Class)) method. A `testUser` instance is created, and the mock is instructed to return it. Next the `UserController` to be tested is instantiated using the mock service. The last lines of the setup method contains the new [MockMvc](https://github.com/SpringSource/spring-test-mvc/blob/master/src/main/java/org/springframework/test/web/server/MockMvc.java) class. It is created by calling a factory method on the builder class [MockMvcBuilders](https://github.com/SpringSource/spring-test-mvc/blob/master/src/main/java/org/springframework/test/web/server/setup/MockMvcBuilders.java). In this example, we choose the standalone option to which the `UserController` instance is passed. Alternatively, there are other factory methods available that creates a `MockMvc` from a web application context, an XML application configuration or a Java based application configuration.

## More tests

With some minor changes of the test method (change the media type to XML and use xpath instead of jsonPath to extract the response data), it can be verified that the Controller can return a user as an XML document: 

```java
@Test
public void shouldGetTestUserAsXml() throws Exception {
    mockMvc
            .perform(get("/user/0")
                    .accept(MediaType.APPLICATION_XML))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_XML))
            .andExpect(xpath("/user/name").string("Test User"))
            .andExpect(xpath("/user/email").string("test.user@somewhere.com"));
}
```

To make sure that clients cannot update a user, another test is created that verifies that POST is not permitted. (The allow header is part of the [HTTP spec](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.7) and added to the response header by Spring. Depending on your business case you may choose to ignore that expectation.):

```java
@Test
public void shouldNotPostToUser() throws Exception {
    mockMvc
            .perform(post("/user/0"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(header()
                    .string("Allow", is("GET")));
}
```

## Debugging

Sometimes it can be a bit hard to debug a test if an expectation fails. On those occasions, it can be beneficial to print some information to find out what is going on: 

```java
@Test
public void printInfo() throws Exception {
    mockMvc
            .perform(get("/user/0"))
            .andDo(print());
}
```

When executed, the test prints information about the request and response to the console. Notably, it also prints information about handler type and handler methods. Due to the simple nature of this example, many of the lines are left blank, but it gives you some indication to what can be verified in other tests: 

```bash
MockHttpServletRequest:
         HTTP Method = GET
         Request URI = /user/0
          Parameters = {}
             Headers = {}

             Handler:
                Type = com.jayway.controller.UserController
              Method = com.jayway.domain.User com.jayway.controller.UserController.getUser(long)

  Resolved Exception:
                Type = null

        ModelAndView:
           View name = null
                View = null
               Model = null

            FlashMap:

MockHttpServletResponse:
              Status = 200
       Error message = null
             Headers = {Content-Type=[application/json]}
        Content type = application/json
                Body = {"name":"Test User","email":"test.user@somewhere.com"}
       Forwarded URL = null
      Redirected URL = null
             Cookies = []
```

For reference, click on the links to get the complete implementation of the [UserControllerTest](https://gist.github.com/3672298#file_user_controller_test.java) and the [User](https://gist.github.com/3672298#file_user.java) class.

## Dependencies

In the spring-mvc-test [read-me file](https://github.com/SpringSource/spring-test-mvc#spring-mvc-test-support), it is stated that: This code will be included in the spring-test module of the Spring Framework. Consequently the project will be moved, hopefully as part of the upcoming Spring 3.2 release, and then the spring-test dependency can be used. However, currently there is a milestone release available in the Spring maven milestone repository. For the tests described above, you also need to add Mockito and JsonPath to your pom:

```xml
<repositories>
    <repository>
        <id>org.springframework.maven.milestone</id>
        <name>Spring Framework Maven Milestone Repository</name>
        <url>http://maven.springframework.org/milestone</url>
    </repository>
</repositories>

<dependencies>
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-test</artifactId>
        <version>3.2.0.RC1</version>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-all</artifactId>
        <version>1.9.0</version>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>com.jayway.jsonpath</groupId>
        <artifactId>json-path</artifactId>
        <version>0.8.1</version>
        <scope>test</scope>
    </dependency>
    
    <!-- More dependencies -->
</dependencies>
```

## Alternatives

Another framework that partly solves the same problem is [REST Assured](http://code.google.com/p/rest-assured/). In comparison to the spring-mvc-test it offers a Java DSL for web based testing, but it focuses on integration testing of a running REST server, e.g. it is not possible to mock Controller dependencies or to validate specific Spring objects that are used internally by the application. On the other hand, it offers features like OAuth authentication and SSL support.

## References

*   Video recording of Sam Brennan's and Rossen Stoyanchev's [session](http://www.infoq.com/presentations/Spring-3-1-and-MVC-Testing-Support) from with live IDE demos (or just the [slides](http://www.slideshare.net/sbrannen/spring-31-and-mvc-testing-support) without demos).
*   The [spring-test-mvc](https://github.com/SpringSource/spring-test-mvc) project at GitHub.
*   The spring-test-mvc [samples](https://github.com/SpringSource/spring-test-mvc/tree/master/src/test/java/org/springframework/test/web/server/samples) at GitHub.
*   [Mockito](http://code.google.com/p/mockito/)
*   The complete [UserControllerTest](https://gist.github.com/3672298#file_user_controller_test.java).

## Edit

Nov 12th, 2012: Updated code examples to reflect the changes in the Spring Framework [3.2 RC1 Release](http://blog.springsource.org/2012/11/05/spring-framework-3-2-rc1-released/). For more information, read Rossen Stoyanchev's blog post about the [Spring MVC Test Framework](http://blog.springsource.org/2012/11/12/spring-framework-3-2-rc1-spring-mvc-test-framework/).