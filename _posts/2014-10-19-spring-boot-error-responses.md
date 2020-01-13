---
title: Spring Boot Error Responses
categories: 
    - Java 
    - web
tags:
    - HTTP
    - Java
    - REST
    - Spring
    - Spring Boot
    - web
---


I have written about Spring's support for web response error handling a few times before (e.g. about [custom error responses]({% post_url 2012-09-16-improve-your-spring-rest-api-part-i %}) and how they can be [generalized]({%post_url 2013-02-03-improve-your-spring-rest-api-part-iii %}). This time, we will take a look at what Spring Boot has to offer. Start by creating a simple controller:

```java
@RestController
class PersonController {

    @Autowired
    private PersonService personService;

    @RequestMapping(value = "/person/{id}",
            method = RequestMethod.GET,
            produces = MediaType.APPLICATION_JSON_VALUE)
    Person get(@PathVariable("id") String id) {
        return personService.find(id);
    }
}
```

First, we verify that the controller is working (the `-v` flag is curl's verbose flag):

```bash
$ curl -v localhost:8080/greet?name=Mattias
[...]
< HTTP/1.1 200 OK
[...]
Hello Mattias!
```

Good, it works as expected. Now, let us introduce an error. Since the `@RequestParam` by default require the presence of the specified parameter, you will get an error if a request is made without it (`json_pp` is the convenient JSON Pure Perl tool for pretty printing JSON):

```bash
curl -v localhost:8080/greet | json_pp
[...]
< HTTP/1.1 400 Bad Request
[...]
{
   "timestamp" : 1413313361387,
   "exception" : "org.springframework.web.bind.MissingServletRequestParameterException",
   "status" : 400,
   "error" : "Bad Request",
   "path" : "/greet",
   "message" : "Required String parameter 'name' is not present"
}
```

Nice! Not only did we get a `400 Bad Request` HTTP status code as one would expect. More importantly, Spring Boot returned an informative response body with data that may be very useful for client developers:

*   A time stamp when the error occured, i.e. `System.currentTimeMillis()`.
*   The kind of exception that occurred.
*   The HTTP status code (same as the response status code).
*   The HTTP status code description (derived from the response status code).
*   The path that was requested.
*   And a message which elaborates the problem further.

What happens if we make a request that has the required `name` parameter, but no value?

```bash
$ curl -v localhost:8080/greet?name | json_pp
[...]
< HTTP/1.1 500 Internal Server Error
[...]
{
   "timestamp" : 1413314685675,
   "exception" : "java.lang.IllegalArgumentException",
   "status" : 500,
   "error" : "Internal Server Error",
   "path" : "/greet",
   "message" : "The 'name' parameter must not be null or empty"
}
```

The value of the `exception` field has been replaced with `IllegalArgumentException` and the `message` field corresponds exactly to the exception message stated by the controller above. Similarily, the HTTP status code in the response header and body is updated to `500 Internal Server Error`, which in some way is correct (in the sense that the server throws an exception it did not handle). However, I argue that `400 Bad Request` is more suitable, since the error occurs because the client did not provide all the required information. So how can we change this?

It turns out that the solution is pretty simple once you know it. The following lines added to your controller will do the trick:

```java
@ExceptionHandler
void handleIllegalArgumentException(IllegalArgumentException e, HttpServletResponse response) throws IOException {
    response.sendError(HttpStatus.BAD_REQUEST.value());
}
```

Repeat the request:

```bash
$ curl -v localhost:8080/greet?name | json_pp
[...]
< HTTP/1.1 400 Bad Request
[...]
{
   "timestamp" : 1413315159949,
   "exception" : "java.lang.IllegalArgumentException",
   "status" : 400,
   "error" : "Bad Request",
   "path" : "/greet",
   "message" : "The 'name' parameter must not be null or empty"
}
```

Voila! The HTTP status code is now `400 Bad Request`, both in the response header as well as in the response body.

If you would like to return the same HTTP status code for multiple exception, you can declare the exceptions in the `@ExceptionHandler` annotation instead of passing them as a method parameters:

```java
@ExceptionHandler({IllegalArgumentException.class, NullPointerException.class})
void handleBadRequests(HttpServletResponse response) throws IOException {
    response.sendError(HttpStatus.BAD_REQUEST.value());
}
```

Lastly, if you add the `@ExceptionHandler` snippets in a controller, it will only work for that particular controller. But if you add them to a separate class annotated with the `@ControllerAdvice` annotation it will work for all controllers (or a subset of them).

## Update

As of Spring Boot version 1.2.0.RC1 issues [1731](https://github.com/spring-projects/spring-boot/issues/1731) and [1762](https://github.com/spring-projects/spring-boot/issues/1762) have been resolved which enables the possibility to set a custom error message in the response:

```java
@ExceptionHandler(IllegalArgumentException.class)
void handleBadRequests(HttpServletResponse response) throws IOException {
    response.sendError(HttpStatus.BAD_REQUEST.value(), "Please try again and with a non empty string as 'name'");
}
```

Whatever message is passed to the `sendError()` method will be copied to the response body:

```bash
$ curl -v localhost:8080/greet?name | json_pp
[...]
< HTTP/1.1 400 Bad Request
[...]
{
   "timestamp" : 1413315159949,
   "exception" : "java.lang.IllegalArgumentException",
   "status" : 400,
   "error" : "Bad Request",
   "path" : "/greet",
   "message" : "Please try again and with a non empty string as 'name'"
}
```

## Considerations

If you would like to validate more complex requests, you can benefit from using the standard JSR-303 Bean Validation API together with [Spring Validation](http://docs.spring.io/spring-framework/docs/4.1.x/spring-framework-reference/html/validation.html#validation-beanvalidation). Please see the [Validating Form Input](https://spring.io/guides/gs/validating-form-input/) Getting Started Guide for a working example.

## Acknowledgements

All credits go to [Andy Wilkinsson](https://twitter.com/ankinson) and [Dave Syer](https://twitter.com/david_syer) for answering the [issue](https://github.com/spring-projects/spring-boot/issues/1677) I filed against Spring Boot regarding this matter.

## References

*   [Exception Handling in Spring MVC](http://spring.io/blog/2013/11/01/exception-handling-in-spring-mvc) at the spring.io/blog.
*   [@ControllerAdvice](http://docs.spring.io/spring-framework/docs/4.1.x/spring-framework-reference/html/mvc.html#mvc-ann-controller-advice) in the Spring reference docs.

## Dependency

Spring Boot version 1.1+.