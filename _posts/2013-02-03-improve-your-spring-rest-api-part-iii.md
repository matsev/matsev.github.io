---
title: Improve Your Spring REST API, Part III
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


Some time ago, I wrote about how the error response of a Spring based REST API can be enhanced, in order to provide the clients with a better understanding of why a request error occurred. In the [first]({% post_url 2012-09-16-improve-your-spring-rest-api-part-i %}) post I explained how a server-side exception triggered by an incoming request can be translated into a generic [ErrorMessage](https://gist.github.com/4519323#file-errormessage-java) class, which in turn was serialized to the response body. In the [second]({% post_url 2012-09-23-improve-your-spring-rest-api-part-ii %}) part, the solution was generalized, to prevent the [@ExceptionHandler](http://static.springsource.org/spring/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-ann-exceptionhandler) methods from being duplicated to all controllers. However, the release of [Spring 3.2](http://blog.springsource.org/2012/12/13/spring-framework-3-2-goes-ga/) last December provides a new feature which greatly simplifies the general solution.

## @ControllerAdvice

The [@ControllerAdvice](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html) is a new [TYPE](http://docs.oracle.com/javase/7/docs/api/java/lang/annotation/ElementType.html?is-external=true#TYPE) annotation that was added as part of the release. A class annotated with it will act as a global helper class for all controllers. In other words, any local, controller specific `@ExceptionHandler` method that is moved from the `@Controller` class to a class annotated with `@ControllerAdvice`, will be applicable for the entire application. Consequently, all the boiler plate code that was created in the generic solution in my last post can be removed. The revisited solution can be as simple as: 

```java
@ControllerAdvice
class GlobalControllerExceptionHandler {
    
    @ExceptionHandler
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    ErrorMessage handleException(SomeException ex) {
        ErrorMessage errorMessage = createErrorMessage(ex);
        return errorMessage;
    }

    @ExceptionHandler
    @ResponseStatus(HttpStatus.GONE)
    @ResponseBody
    ErrorMessage handleException(OtherException ex) {
        ErrorMessage errorMessage = createErrorMessage(ex);
        return errorMessage;
    }   
}
```

The previous posts contained error handling examples of some Spring MVC exceptions, namely the `MethodArgumentNotValidException`, the `HttpMediaTypeNotSupportedException` and the `HttpMessageNotReadableException`. A corresponding Spring 3.2 based implementation can be found in the [GlobalControllerExceptionHandler](https://gist.github.com/4519323#file-globalcontrollerexceptionhandler-java), or continue reading for yet another implementation.

## ResponseEntityExceptionHandler

The above example works well, but it can be hard to identify the Spring MVC specific exceptions to implement a common error response handling strategy for them. One way of overcoming this problem is to extend the [ResponseEntityExceptionHandler](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/web/servlet/mvc/method/annotation/ResponseEntityExceptionHandler.html) class, which was also added to the Spring 3.2 release. Similarly to the [DefaultHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/web/servlet/mvc/support/DefaultHandlerExceptionResolver.html), it provides methods for handling the exceptions, but it allows the developer to specify [ResponseEntity](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/http/ResponseEntity.html)s as return values (as opposed to the [ModelAndView](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/web/servlet/ModelAndView.html)s that are returned by the methods in the `DefaultHandlerExceptionResolver`). The implementation is still straight forward, create a class, annotate it with the `@ControllerAdvice`, extend the `ResponseEntityExceptionHandler` class and override the methods with the exception types that you are interested in:

```java
@ControllerAdvice
public class CustomResponseEntityExceptionHandler extends ResponseEntityExceptionHandler {

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatus status, WebRequest request) {
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
        ErrorMessage errorMessage = new ErrorMessage(errors);
        return new ResponseEntity(errorMessage, headers, status);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex, HttpHeaders headers, HttpStatus status, WebRequest request) {
        String unsupported = "Unsupported content type: " + ex.getContentType();
        String supported = "Supported content types: " + MediaType.toString(ex.getSupportedMediaTypes());
        ErrorMessage errorMessage = new ErrorMessage(unsupported, supported);
        return new ResponseEntity(errorMessage, headers, status);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatus status, WebRequest request) {
        Throwable mostSpecificCause = ex.getMostSpecificCause();
        ErrorMessage errorMessage;
        if (mostSpecificCause != null) {
            String exceptionName = mostSpecificCause.getClass().getName();
            String message = mostSpecificCause.getMessage();
            errorMessage = new ErrorMessage(exceptionName, message);
        } else {
            errorMessage = new ErrorMessage(ex.getMessage());
        }
        return new ResponseEntity(errorMessage, headers, status);
    }
}
```

## Comments

*   The `@ControllerAdvice` annotation is an `@Component`. As such, an annotated class will be registered as a Spring bean if the package in which it is located in is subject to component scanning.
*   The `@ControllerAdvice` also supports methods annotated with [@InitBinder](http://static.springsource.org/spring/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-ann-webdatabinder) and [@ModelAttribute](http://static.springsource.org/spring/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-ann-modelattrib-methods).

## References

*   [@ControllerAdvice](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html)
*   [ResponseEntityExceptionHandler](http://static.springsource.org/spring/docs/3.2.x/javadoc-api/org/springframework/web/servlet/mvc/method/annotation/ResponseEntityExceptionHandler.html)
*   [Spring MVC Exceptions](http://static.springsource.org/spring/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-ann-rest-spring-mvc-exceptions)
*   [New Features and Enhancements in Spring Framework 3.2](http://static.springsource.org/spring-framework/docs/3.2.0.RELEASE/spring-framework-reference/html/new-in-3.2.html)
*   Video about Spring [Error reporting in REST scenarios](http://www.youtube.com/watch?v=GSsWMLiKF-M#t=2994s)