---
title: Improve Your Spring REST API, Part I
categories:
    - Java 
    - web
tags: 
    - HTTP
    - Java
    - REST
    - Spring
    - web
---


After watching [Jonathan Dahl's presentation](http://oredev.org/2011/sessions/advanced-api-design-how-an-awesome-api-can-attract-friends-make-you-rich-and-change-the-world) about API design from the Øredev conference last year, especially the parts about [Smart Validations](http://vimeo.com/41968498#at=819), it is apparent that you can do much more to help your client developers than just returning HTTP status code _500 - Internal Server Error_, when a request to your REST API fails.

## Spring WEB MVC

The Spring Web MVC framework is a great tool for creating restful web services. It takes care of request mapping, validation, serialization and de-serialization just to name a few. When it comes to error handling, the [DefaultHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers-resolver) makes a really good job behind the scenes for translating common exceptions to suitable HTTP status codes and adding response headers when applicable. If there is no resource mapped to the request URI, _404 - Not Found_, is set as response code. If a HTTP method is not supported by a particular request URI, _405 - Method Not Allowed_, is set as response code and the _Allow_ response header is set to indicate which method(s) that can be used instead, and so on. Unfortunately, things are not always that easy. What about when the developer receives a _400 - Bad Request_? Obviously, there is something wrong with the request, but the response fails to tell the developer **why** it is not accepted. Take a look at the following controller method: 

```java
@RequestMapping(value = "/user/{userId}",
        method = RequestMethod.PUT,
        consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
@ResponseStatus(HttpStatus.NO_CONTENT)
void update(@PathVariable("userId") long userId, 
        @RequestBody @Valid User user) {
    userService.update(userId, user);
}
```

Even with the implementation available, it is impossible to unambiguously determine the cause of failure. Perhaps the de-serialization of the request body to the `User` object failed? Maybe the validation failed? Other possible causes of a _400 - Bad Request_ include erroneous request parameters, missing request headers, etc. Inspired by Jonathan's presentation, the idea is that the server will still respond with appropriate status codes, and the appropriate headers when applicable. Additionally, the response body should contain information that can assist the client developer, and in the format that the client requested (as specified by the [Accept](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.1) request header). For example, if the server expects a `name` and a valid `email` as part of the request, a suitable response could be a _400 - Bad Request_ with the following response body:

```json
{
    "errors": [
        "name, may not be empty",
        "email, not a well-formed email address"
    ]
}
```

## Solution

The [@ExceptionHandler](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-exceptionhandler) in conjunction with the [@ResponseBody](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-responsebody) provide a simple solution to the problem: 

```java
@ExceptionHandler
@ResponseStatus(HttpStatus.BAD_REQUEST)
@ResponseBody
ErrorMessage handleException(MethodArgumentNotValidException ex) {
    List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors();
    List<ObjectError> globalErrors = ex.getBindingResult().getGlobalErrors();
    List<String> errors = new ArrayList<>(fieldErrors.size() + globalErrors.size());
    String error;
    for (FieldError fieldError : fieldErrors) {
        error = fieldError.getField() + ", " + fieldError.getDefaultMessage();
        errors.add(error);
    }
    for (ObjectError objectError : globalErrors) {
        error = objectError.getObjectName() + ", " + objectError.getDefaultMessage();
        errors.add(error);
    }
    return new ErrorMessage(errors);
}
```

The `ErrorMessage` is a simple helper class used for serialization:

```java
@XmlRootElement
public class ErrorMessage {

    private List<String> errors;

    public ErrorMessage() {
    }

    public ErrorMessage(List<String> errors) {
        this.errors = errors;
    }

    public ErrorMessage(String error) {
        this(Collections.singletonList(error));
    }

    public ErrorMessage(String ... errors) {
        this(Arrays.asList(errors));
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }
}
```

## Considerations

There is plenty of more information that may be added to the response that could be valuable for the REST API users. Some suggestions that come to mind are a _default message_ text that could be presented to the end user, a _custom error code_ for client developers or a link to relevant part of the application specific _REST API doc_, if it is published online. Another question is how the error handling can be generalized to prevent the `@ExceptionHandler` implementation from being copied between all controllers in the project. Note, the example above includes just one of the potential error causes, it is likely that there are more similar implementations for other exceptions.

## Side notes

### JSR 303

The ability to use the [@Valid](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/validation.html#validation-mvc) annotation as part of a `@RequestBody` controller method argument was introduced in Spring 3.1. For completeness, the JAXB validation of the `User` class could be implemented as: 

```java
@XmlRootElement
public class User {

    @NotBlank
    @Length(min = 3, max = 30)
    private String name;

    @Email
    private String email;

    // Getters and setters omitted
}
```

The [Spring reference documentation](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/validation.html#validation-mvc-jsr303) provides configuration details.

### XML

You may have noticed the `@XmlRootElement` annotation on the `ErrorMessage` class. It is a JAXB annotation required to make the XML serialization work. No additional dependency is required, since JAXB 2.0 was added to [JDK 6u3](http://jaxb.java.net/guide/Which_JAXB_RI_is_included_in_which_JDK_.html).

### JSON

A JSON message converter for serialization and deserialization is added [automatically](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-config-enable) by Spring by just adding Jackson to the classpath. No additional setting is required, however you can tailor the behavior by adding Jackson annotation to your objects.

## Dependencies

*   Spring 3.1.2.RELEASE
*   jackson-databind 2.0.5

## References

*   Spring reference documentation:
    *   [Spring Web MVC](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html)
    *   [DefaultHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers-resolver)
    *   [@ExceptionHandler](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-exceptionhandler)
    *   [@ResponseBody](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-responsebody)
*   The HTTP specification:
    *   [HTTP headers](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html)
    *   [HTTP methods](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html)
    *   [HTTP status codes](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html)