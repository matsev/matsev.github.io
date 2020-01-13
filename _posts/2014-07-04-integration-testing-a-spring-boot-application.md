---
title: Integration Testing a Spring Boot Application
excerpt: Example of how you can use Rest Assured when implementing integration tests for a Spring Boot application.
categories:
    - Java
    - testing 
    - web
tags: 
    - Java
    - REST
    - Rest Assured
    - Spring
    - Spring Boot
    - testing
    - web
---


Spring Boot brings about some welcome defaults configurations that significantly decreases the development time of Spring projects. It also has some useful additions when it comes to simplified integration testing. Traditionally, one would use the build script to fire up an embedded container such as Jetty, Tomcat or Cargo, but since a Spring Boot web application already comprises an embedded servlet container some convenient utilities have been created so it can be reused for integration testing.

## Sample Application

Let us have a look at a sample application. First, there is an entity class based on JPA:

```java
@Entity
public class Character {

    @Column(name = "name")
    private String name;

    @Id
    @Column(name = "id")
    @GeneratedValue
    private Integer id;

    // getters, setters, etc, omitted
}
```

A corresponding repository based on Spring Data JPA:

```java
public interface CharacterRepository extends JpaRepository {
}
```

A Spring 4 Controller:

```java
@RestController
class CharacterController {

    @Autowired
    private CharacterRepository repository;

    @RequestMapping("/characters")
    List characters() {
        return repository.findAll();
    }

    @RequestMapping(value = "/characters/{id}", method = RequestMethod.DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable("id") Integer id) {
        repository.delete(id);
    }

    // more controller methods
} 
```

And a Spring Boot application:

```java
@Configuration
@ComponentScan
@EnableAutoConfiguration
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

Unless you have used Spring Boot before, you will be pleasantly surprised that (besides adding the appropriate dependencies on your classpath) this is actually all that is required to create a complete Spring Boot web application including database persistence! If, let’s say that `Mickey Mouse`, `Minnie Mouse` and `Pluto` were the only three characters in the database, a request to `/characters` would give the following response:

```bash
$ curl localhost:8080/characters
[{"name":"Mickey Mouse","id":1},{"name":"Minnie Mouse","id":2},{"name":"Pluto","id":3}]
```

Curl is a good tool for trying out things on the command line, but it is less suitable for writing automated integration tests.

## Spring Boot Test

To verify that the application works, one could create the following test class. Scroll down to read explanations for each `// nbr` below.

```java
@RunWith(SpringJUnit4ClassRunner.class)   // 1
@SpringApplicationConfiguration(classes = Application.class)   // 2
@WebAppConfiguration   // 3
@IntegrationTest("server.port:0")   // 4
public class CharacterControllerTest {

    @Autowired   // 5
    CharacterRepository repository;

    Character mickey;
    Character minnie;
    Character pluto;

    @Value("${local.server.port}")   // 6
    int port;

    @Before
    public void setUp() {
        // 7
        mickey = new Character("Mickey Mouse");
        minnie = new Character("Minnie Mouse");
        pluto = new Character("Pluto");

        // 8
        repository.deleteAll();
        repository.save(Arrays.asList(mickey, minnie, pluto));

        // 9
        RestAssured.port = port;
    }

    // 10
    @Test
    public void canFetchMickey() {
        Integer mickeyId = mickey.getId();

        when().
                get("/characters/{id}", mickeyId).
        then().
                statusCode(HttpStatus.SC_OK).
                body("name", Matchers.is("Mickey Mouse")).
                body("id", Matchers.is(mickeyId));
    }

    @Test
    public void canFetchAll() {
        when().
                get("/characters").
        then().
                statusCode(HttpStatus.SC_OK).
                body("name", Matchers.hasItems("Mickey Mouse", "Minnie Mouse", "Pluto"));
    }

    @Test
    public void canDeletePluto() {
        Integer plutoId = pluto.getId();

        when()
                .delete("/characters/{id}", plutoId).
        then().
                statusCode(HttpStatus.SC_NO_CONTENT);
    }
}
```

### Explanation

Hint, more information can be found in the Javadoc of each class, just click on the corresponding link.

1. Like any other Spring based test, we need the [SpringJUnit4ClassRunner](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/test/context/junit4/SpringJUnit4ClassRunner.html) so that an application context is created.
2. The [@SpringApplicationConfiguration](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/test/SpringApplicationConfiguration.html) annotation is similar to the [@ContextConfiguration](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/test/context/ContextConfiguration.html) annotation in that it is used to specify which application context(s) that should be used in the test. Additionally, it will trigger logic for reading Spring Boot specific configurations, properties, and so on.
3. [@WebAppConfiguration](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/test/context/web/WebAppConfiguration.html) must be present in order to tell Spring that a [WebApplicationContext](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/web/context/WebApplicationContext.html) should be loaded for the test. It also provides an attribute for specifying the path to the root of the web application.
4. [@IntegrationTest](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/test/IntegrationTest.html) is used to instruct Spring Boot that the embedded web server should be started. By providing colon- or equals-separated name-value pair(s), any environment variable can be overridden. In this example, the `"server.port:0"` will override the server's default port setting. Normally, the server would start using the specified port number, but the value `0` has a special meaning. When specified, it tells Spring Boot to scan the ports on the host environment and start the server on a random, available port. That is useful if you have different services occupying different ports on the development machines and the build server that could potentially collide with the application port, in which case the application will not start. Secondly, if you create multiple integration tests with different application contexts, they may also collide if the tests are running concurrently.
5. We have access to the application context and can use autowiring to inject any Spring bean.
6. The `@Value("${local.server.port}”)` will be resolved to the actual port number that is used.
7. We create some entities that we can use for validation.
8. The database is cleared and re-initialized for each test so that we always validate against a known state. Since the order of the tests is not defined, chances are that the `canFetchAll()` test fails if it is executed after the `canDeletePluto()` test.
9. We instruct [Rest Assured](https://github.com/jayway/rest-assured) to use the correct port. It is an open source project that provides a Java DSL for testing restful services, founded by my colleague [Johan Haleby](https://blog.jayway.com/author/johanhaleby/) (follow the link to read his blog posts, including more about Rest Assured).
10. Test are implemented by using Rest Assured. You could implement the tests using the [TestRestTemplate](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/test/TestRestTemplate.html) or any other http client, but I find the Rest Assured syntax both clear and concise.

## Advantages

Some advantages with using Spring Boot's embedded container during testing:

*   Development test turnaround time. You can change a test (or the code that is verified by the test) and execute the test immediately. Compare that with rebuilding the entire project, launch an embedded server, and then execute the test.
*   Spring Boot enable us to create tests that access any Spring bean, the REST API as well as the database directly. If you create tests using an embedded server in your build script you can only interact with the REST API and the database (unless it is an embedded database).
*   The very same container is used during development, testing and production. Hence there is no discrepancy between different vendor implementations or server versions. Moreover, the server configuration will be tested and verified in all environments (typically, you will only change environment specific settings such as database url and password, administrator credentials, etc).

## Considerations

*   You cannot create [transaction based](http://docs.spring.io/spring-framework/docs/4.0.x/spring-framework-reference/html/testing.html#testing-tx) tests when making requests to the REST API, despite that you could autowire the transaction manager in your test. The reason is that any transaction defined in your application, regardless of where it is declared, will be committed before the server response is sent. Consequently, it will be too late for a test to roll back any state using the [@Transactional](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/transaction/annotation/Transactional.html) annotation when the test completes.
*   It is possible to verify your application responses without starting a server by using the [Spring Mvc Test Framework](http://docs.spring.io/spring-framework/docs/4.0.x/spring-framework-reference/html/testing.html#spring-mvc-test-framework) framework. Just remove the `@IntegrationTest` annotation, and rewrite the test implementations using the [MockMvc](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/test/web/servlet/MockMvc.html) class as showed in this [example](https://spring.io/blog/2012/11/12/spring-framework-3-2-rc1-spring-mvc-test-framework). The execution time of these tests will be shorter, since no application server is involved.

## Spring Boot reference documentation

*   [Testing Spring Boot applications](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#boot-features-testing-spring-boot-applications)
*   [Use a random unassigned HTTP port](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#howto-user-a-random-unassigned-http-port)
*   [Discover the HTTP port at runtime](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#howto-discover-the-http-port-at-runtime)

## Dependencies

*   spring-boot-starter-web 1.1.3.RELEASE
*   spring-boot-starter-data-jpa 1.1.3.RELEASE
*   hsqldb 2.3.2
*   spring-boot-starter-test 1.1.3.RELEASE
*   hamcrest-core 1.3
*   rest-assured 2.3.2.