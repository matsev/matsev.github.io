---
title: Scaling Out with Spring Session
excerpt: A brief introduction to how Spring Session can be used when scaling out servlet sessions.
categories:
    - Java 
    - web
tags:
    - HTTP
    - HTTP Session
    - Java
    - Redis
    - Servlet
    - Spring
    - Spring Session
    - web
---


Stateless architecture has become increasingly popular during resent years and for good reasons. However, stateful session based applications continue to play an important role, for example when issuing [CSRF tokens](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet) for improved security. When deployed on a single server with little load, session management is pretty straight forward as long as you use a reasonable expiration timeout and do not store to much data in the session. Things become trickier when scaling out because each request needs to be associated with its corresponding session that may reside on another server. To overcome this, server vendors have implemented various kinds of session replication between their servers. Alternatively, load balancers can be configured to use sticky sessions. Both these solutions work, but with [Spring Session](http://projects.spring.io/spring-session/) Spring has created another option. This blog will show how you can use [Redis](http://redis.io/) together with Spring Session to scale out sessions. The suggested solution can be used with any servlet (not just Spring based) which also makes it suitable if you need to scale out legacy web apps.

## Example Application

First, we take a look at a simple, session based, `HelloServlet`:

```java
public class HelloServlet extends HttpServlet {

    private static final String NAME = "name";

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        // get name from session, or return default
        String name = Optional.ofNullable(req.getSession(false))
                .map(session -> (String) session.getAttribute(NAME))
                .orElse("World");
        // create a greeting with the name
        String greeting = String.format("Hello %s!", name);

        // write response
        try (ServletOutputStream out = resp.getOutputStream()) {
            out.write(greeting.getBytes(StandardCharsets.UTF_8));
            out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
        // get the name parameter from the request (possibly null)
        String name = req.getParameter(NAME);
        // store the name variable as a session attribute
        req.getSession().setAttribute(NAME, name);
    }
}
```

When called with a HTTP GET, the servlet will respond with either `Hello Mattias!` if there is a session that has an attribute called `name` with the value `Mattias`. If not, the servlet will respond with a default `Hello World!`. When called with a HTTP POST, the servlet will read the `name` parameter from the request, create a new session (or re-use an existing) and store the value of the name in the corresponding session attribute. First request, no session, i.e. GET the default answer:

```bash
$ curl http://localhost:8080
Hello World!
```

Second request, create a session by POSTing a request with a `name` attribute:

```bash
$ curl -i -d "name=Mattias" http://localhost:8080
[...]
Set-Cookie: Set-Cookie: JSESSIONID=A8F4049EE2A2CBDEA70EBD232328610A; Path=/; HttpOnly
[...]
```

Side note, the `-i` (or `—-include`) is a cURL flag for including HTTP headers in the response and the `-d` (or `—data`) flag is used to submit data as request parameters. In the response, we take note of the value of the `Set-Cookie` header. Third request, GET and validate the session state:

```bash
$ curl -H "Cookie: JSESSIONID=A8F4049EE2A2CBDEA70EBD232328610A" http://localhost:8080
Hello Mattias!
```

The problem we are facing is that when we perform the same request on another instance of the application, the default response is returned despite that the session is provided:

```bash
$ curl -H "Cookie: JSESSIONID=A8F4049EE2A2CBDEA70EBD232328610A" http://localhost:8081
Hello World!
```

Enter Spring Session!

## Spring Session architecture

The idea behind Spring Session is pretty straight forward:

*   Create a new Servlet filter
*   Add the filter to the filter chain of your servlet
*   Connect the filter to the Redis connection (or an other [MapSessionRepository](http://docs.spring.io/spring-session/docs/1.0.1.RELEASE/reference/html5/#api-mapsessionrepository) backed by Hazelcast, GemFire, Coherence or any other data grid that can give you a `Map` reference, but that is outside the scope of this blog)

## Adding dependencies

First we need to add a couple of dependencies. If you use Maven, you can add the following lines to your pom:

```xml
<dependency>
    <groupid>org.springframework.session</groupid>
    <artifactid>spring-session-data-redis</artifactid>
    <version>1.0.1.RELEASE</version>
</dependency>
<dependency>
    <groupid>org.springframework</groupid>
    <artifactid>spring-web</artifactid>
    <version>4.1.6.RELEASE</version>
</dependency>
```

The first dependency is required for the Redis connection, the second is required by Spring to create the servlet filter.

## Spring Session Config

Spring Session comes with support for Redis connection (based on the [Jedis client](https://github.com/xetorthio/jedis) internally). You will find an example of a Spring XML based configuration below, but you can substitute that for a [Java based configuration](http://docs.spring.io/spring-session/docs/1.0.x/reference/html5/guides/httpsession.html#httpsession-spring-configuration) instead.

```xml
<!--?xml version="1.0" encoding="UTF-8"?-->
<beans xmlns="http://www.springframework.org/schema/beans" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:context="http://www.springframework.org/schema/context" xmlns:p="http://www.springframework.org/schema/p" xsi:schemalocation="
        http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
        http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd">

    <context:annotation-config>

    <bean class="org.springframework.session.data.redis.config.annotation.web.http.RedisHttpSessionConfiguration">
        <context:property-placeholder location="classpath:application.properties">
            <bean class="org.springframework.data.redis.connection.jedis.JedisConnectionFactory" p:port="${spring.redis.port}"></bean>
        </context:property-placeholder>
    </bean>
    </context:annotation-config>
</beans>
```


The last two lines instruct Spring to look for an `application.properties` file with a `spring.redis.port` value. In this example, it is just a one-liner:

```properties
spring.redis.port=6379
```

## Registering the Spring Session Config

You need to add a few lines to the `web.xml` in order for the Spring Session configuration to be loaded (unless your application uses Spring already):

```xml
<context-param>
    <param-name>contextConfigLocation</param-name>
    <param-value>/WEB-INF/spring/*.xml</param-value>
</context-param>

<listener>
    <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>
```


## Adding the Spring Session servlet filter

The last change that is required in your application is that you add a new servlet filter. Open the `web.xml` again, and add these lines:

```xml
<filter>
    <filter-name>springSessionRepositoryFilter</filter-name>
    <filter-class>org.springframework.web.filter.DelegatingFilterProxy</filter-class>
</filter>
<filter-mapping>
    <filter-name>springSessionRepositoryFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

You can see all required changes in a [single commit](https://github.com/matsev/spring-session-example/commit/cab2883d637ebcbf176d9ce66b95891011face17).

## Verification

Now that we have updated the application, it is time to verify that it works as expected.

*   Rebuild your application
*   Make sure that your Redis cluster is up and running at port `6379` (which is the default port). If it is running on different port, you need to update the `spring.redis.port` setting accordingly
*   Start two instances of the application, lets say one on port 8080 and one on port 8081, that are connected to the same Redis cluster
*   Issue the request as before

First, POST the session state to one of the server instance:

```bash
$ curl -i -d "name=Mattias" localhost:8080
[...]
Set-Cookie: SESSION=12b70435-9e6a-4e67-b544-01394dd59da0; Path=/; HttpOnly
[...]
```

Verify the session state by making a GET request to the same instance:

```bash
$ curl -H "Cookie: SESSION=12b70435-9e6a-4e67-b544-01394dd59da0" localhost:8080
Hello Mattias!
```

And if we repeat the same request on the other server, we see that we have the same session data:

```bash
$ curl -H "Cookie: SESSION=12b70435-9e6a-4e67-b544-01394dd59da0" localhost:8081
Hello Mattias!
```

## Considerations

*   You can start and stop server instances as you please without worrying about loosing sessions, i.e. failover and autoscaling is handled automatically from a session point of view.
*   You do not need sticky sessions or any advanced load balancer configuration. A simple round-robin strategy to distribute the load will suffice.
*   From an operations point of view there is still work to do. Someone needs to setup and manage the Redis cluster ([Amazon ElasticCache](http://aws.amazon.com/elasticache/) is a good fit if you are running on AWS).
*   If you are using Spring Boot you probably do not want to add neither the `spring-session.xml` configuration nor the `web.xml`. Take a look at the [Spring Boot Guide](http://docs.spring.io/spring-session/docs/1.0.x/reference/html5/guides/boot.html) to see what a Java based configuration may look like.
*   What if you are developing a RESTful API and do not like cookies? Take a look at [Spring Session Rest](http://docs.spring.io/spring-session/docs/1.0.x/reference/html5/guides/rest.html).

## References

*   Spring Session [project page](http://projects.spring.io/spring-session/)
*   Spring Session [reference docs](http://docs.spring.io/spring-session/docs/1.0.x/reference/html5/)
*   Spring Session [source code](https://github.com/spring-projects/spring-session)
*   [source code](https://github.com/matsev/spring-session-example) for the project above