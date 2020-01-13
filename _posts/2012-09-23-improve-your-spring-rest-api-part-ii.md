---
title: Improve Your Spring REST API, Part II
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


In the [previous blog post]({% post_url 2012-09-16-improve-your-spring-rest-api-part-i %}), I explained how a custom [@ExceptionHandler](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-exceptionhandler) can be used to return feedback to REST API clients when they are submitting erroneous requests. However, the suggested implementation does not scale, because an `@ExceptionHandler` method is only applicable for a specific controller. In a real project, it is likely that we would like consistent error handling across multiple controllers. The easiest way to overcome this problem is to create a common super class that can be extended by all other controllers. To create a more generic solution to the problem, we can look under the hood of Spring itself and get inspired.

## Edit

Feb 3rd, 2013: The `@ControllerAdvice` and the `ResponseEntityExceptionHandler` in the Spring 3.2 release effectively obsoletes the implementation below. Please read the updated solution in [next blog]({% post_url 2013-02-03-improve-your-spring-rest-api-part-iii %}) unless you are stuck with an older version of Spring.

## Goal

The intent of this blog post is to implement a custom [HandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers) that in addition to the HTTP status codes also writes useful data to the response body when an exception occurs. The idea is to create a pluggable solution that generates error messages consistently by reusing the [ErrorMessage](https://gist.github.com/3104749#file_error_message.java) class introduced in the previos blog post. The content of an error message depends on the specific exception and it should be derived by implementing a factory interface:

```java
/**
 * Factory interface for creating {@link ErrorMessage} based on a specific {@code Exception}.
 * @param <T> The specific exception type.
 */
public interface ErrorMessageFactory<T extends Exception> {

    /**
     * Gets the exception class used for this factory.
     * @return An exception class.
     */
    Class<T> getExceptionClass();

    /**
     * Creates an {@link ErrorMessage} from an exception.
     * @param ex The exception to get data from.
     * @return An error message.
     */
    ErrorMessage getErrorMessage(T ex);

    /**
     * Gets the HTTP status response code that will be written to the response when the message occurs.
     * @return An HTTP status response.
     */
    int getResponseCode();
}
```

## Spring Classes

Before getting to work, there are a couple of Spring classes that we need to get acquainted with:

### DefaultHandlerExceptionResolver

Like many other Spring classes, the [DefaultHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers-resolver) has a long and rather self explanatory name. Its purpose as quoted from the [javadoc](http://static.springsource.org/spring/docs/3.1.x/javadoc-api/org/springframework/web/servlet/mvc/support/DefaultHandlerExceptionResolver.html):

> Default implementation of the HandlerExceptionResolver interface that resolves standard Spring exceptions and translates them to corresponding HTTP status codes. This exception resolver is enabled by default in the org.springframework.web.servlet.DispatcherServlet.

Take a look at the implementation of its [doResolveException()](https://github.com/SpringSource/spring-framework/blob/v3.1.2.RELEASE/org.springframework.web.servlet/src/main/java/org/springframework/web/servlet/mvc/support/DefaultHandlerExceptionResolver.java#L93) method available at GitHub. As can be seen, it delegates to the many `handle*()` methods depending on the type of exception that occurs, and then the HTTP Status code is assigned accordingly. Both the `doResolveException()` method and all `handle*()` methods are `protected` which means that here is an opportunity to extend the class and provide alternative implementations. This also suggests that any subclass should be specific about which handle methods to override, which makes it less suitable for a generic solution.

### AnnotationMethodHandlerExceptionResolver

Have you ever wondered what makes a custom `@ExceptionHandler` method tick? The implementation is handled by the [AnnotationMethodHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/javadoc-api/org/springframework/web/servlet/mvc/annotation/AnnotationMethodHandlerExceptionResolver.html). In contrast to the previously mentioned `DefaultHandlerExceptionResolver`, it is able to serialize return values annotated with the [@ResponseBody](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-responsebody) into the HTTP response body, something that will be necessary for our project at hand. A closer look at the [handleResponseBody()](https://github.com/SpringSource/spring-framework/blob/v3.1.2.RELEASE/org.springframework.web.servlet/src/main/java/org/springframework/web/servlet/mvc/annotation/AnnotationMethodHandlerExceptionResolver.java#L415) method at GitHub reveals the implementation details.

## Custom HandlerExceptionResolver

Another observation of the `DefaultHandlerExceptionResolver` and the `AnnotationMethodHandlerExceptionResolver` classes is that they extend the same parent class, namely the [AbstractHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/javadoc-api/org/springframework/web/servlet/handler/AbstractHandlerExceptionResolver.html). With this knowledge, we can implement a custom `ErrorMessageHandlerExceptionResolver`:

```java
public class ErrorMessageHandlerExceptionResolver extends AbstractHandlerExceptionResolver {

    private static final int DEFAULT_ORDER = 0;
    
    private Map<Class<? extends Exception>, ErrorMessageFactory> errorMessageFactories;
    private HttpMessageConverter<?>[] messageConverters;

    public ErrorMessageHandlerExceptionResolver() {
        setOrder(DEFAULT_ORDER);
    }

    public void setErrorMessageFactories(ErrorMessageFactory[] errorMessageFactories) {
        this.errorMessageFactories = new HashMap<>(errorMessageFactories.length);
        for (ErrorMessageFactory<?> errorMessageFactory : errorMessageFactories) {
            this.errorMessageFactories.put(errorMessageFactory.getExceptionClass(), errorMessageFactory);
        }
    }

    public void setMessageConverters(HttpMessageConverter<?>[] messageConverters) {
        this.messageConverters = messageConverters;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected ModelAndView doResolveException(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        ErrorMessageFactory errorMessageFactory = errorMessageFactories.get(ex.getClass());
        if (errorMessageFactory != null) {
            response.setStatus(errorMessageFactory.getResponseCode());
            ErrorMessage errorMessage = errorMessageFactory.getErrorMessage(ex);
            ServletWebRequest webRequest = new ServletWebRequest(request, response);
            try {
                return handleResponseBody(errorMessage, webRequest);
            } catch (Exception handlerException) {
                logger.warn("Handling of [" + ex.getClass().getName() + "] resulted in Exception", handlerException);
            }
        }
        return null;
    }

    /**
     * Copied from {@link org.springframework.web.servlet.mvc.annotation.AnnotationMethodHandlerExceptionResolver}
     */
    @SuppressWarnings("unchecked")
    private ModelAndView handleResponseBody(Object returnValue, ServletWebRequest webRequest)
            throws ServletException, IOException {

        HttpInputMessage inputMessage = new ServletServerHttpRequest(webRequest.getRequest());
        List<MediaType> acceptedMediaTypes = inputMessage.getHeaders().getAccept();
        if (acceptedMediaTypes.isEmpty()) {
            acceptedMediaTypes = Collections.singletonList(MediaType.ALL);
        }
        MediaType.sortByQualityValue(acceptedMediaTypes);
        HttpOutputMessage outputMessage = new ServletServerHttpResponse(webRequest.getResponse());
        Class<?> returnValueType = returnValue.getClass();
        if (this.messageConverters != null) {
            for (MediaType acceptedMediaType : acceptedMediaTypes) {
                for (HttpMessageConverter messageConverter : this.messageConverters) {
                    if (messageConverter.canWrite(returnValueType, acceptedMediaType)) {
                        messageConverter.write(returnValue, acceptedMediaType, outputMessage);
                        return new ModelAndView();
                    }
                }
            }
        }
        if (logger.isWarnEnabled()) {
            logger.warn("Could not find HttpMessageConverter that supports return type [" + returnValueType + "] and " +
                    acceptedMediaTypes);
        }
        return null;
    }
}
```

### Implementation Comments

*   The `setOrder()` method is called by the constructor. The `AbstractHandlerExceptionResolver` implements the [Ordered](http://static.springsource.org/spring/docs/3.1.x/javadoc-api/org/springframework/core/Ordered.html) interface that Spring uses to prioritize between different exception handlers if there is more than one implementation in the current application context.
*   The `setErrorMessageFactories()` is where the different `ErrorMessageFactory`s are supplied.
*   The `setMessageConverters()` is used to provide the necessary [HttpMessageConverter](http://static.springsource.org/spring/docs/3.1.x/javadoc-api/org/springframework/http/converter/HttpMessageConverter.html)s needed for the serialization of the `ErrorMessage`s.

## ErrorMessageFactory implementations

Now, we create different implementations of the `ErrorMessageFactory` interface for various exceptions. For example, the `@ExceptionHandler` for the `MethodArgumentNotValidException` that was implemented in the previous blog post can be implemented as an `MethodArgumentNotValidExceptionErrorMessageFactory`: 

```java
public class MethodArgumentNotValidExceptionErrorMessageFactory implements ErrorMessageFactory<MethodArgumentNotValidException> {

    @Override
    public Class<MethodArgumentNotValidException> getExceptionClass() {
        return MethodArgumentNotValidException.class;
    }

    @Override
    public int getResponseCode() {
        return HttpServletResponse.SC_BAD_REQUEST;
    }

    @Override
    public ErrorMessage getErrorMessage(MethodArgumentNotValidException ex) {
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
}
```

Other examples include a [HttpMediaTypeNotSupportedExceptionErrorMessageFactory](https://gist.github.com/3104749#file_http_media_type_not_supported_exception_error_message_factory.java) for generating error messages for unsupported media types and a [HttpMessageNotReadableExceptionErrorMessageFactory](https://gist.github.com/3104749#file_http_message_not_readable_exception_error_message_factory.java) for cases when the reading of a request message body fails, e.g. due to a parse exception. These are just some examples, it is easy to implement more factories if necessary.

## Putting it together

The last piece of the solution is to create a `WebApplicationContext` in which the `ErrorMessageHandlerExceptionResolver` bean, the `ErrorMessageFactory` beans and the `HttpMessageConverter`s are wired together. Several options are available, e.g. Java based configuration, adding `@Component` and `@Autowire` annotations (or their JSR-330 counterparts) to the provided snippets and let component scanning take care of the rest, or to use the more traditional XML based configuration. The choice is not different from any other Spring MVC project configuration, it is just a matter of personal preference.

## Future Improvements

The suggested solution is based on Spring 3.1, and it is very likely that the suggested solution will be obsoleted by the Spring 3.2 release. Spring has also recognized the advantages of returning a response body in conjunction with an HTTP error code. Issue [SPR-8406 - Create separate handler stereotype for RESTful web services](https://jira.springsource.org/browse/SPR-8406) in the Spring Jira addresses the problem, a solution based on the new [ResponseEntityExceptionHandler](https://github.com/SpringSource/spring-framework/blob/3.2.0.M2/spring-webmvc/src/main/java/org/springframework/web/servlet/mvc/method/annotation/ResponseEntityExceptionHandler.java) class and the new [@ControllerAdvice](https://github.com/SpringSource/spring-framework/blob/3.2.0.M2/spring-web/src/main/java/org/springframework/web/bind/annotation/ControllerAdvice.java) annotation has been implemented and is available as part of the Spring 3.2 M2 release.

## Dependencies

*   Spring 3.1.2.RELEASE
*   jackson-databind 2.0.5

## References

*   Spring Framework source code at [GitHub](https://github.com/SpringSource/spring-framework/)
*   Spring reference documentation:
    *   [DefaultHandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers-resolver)
    *   [@ExceptionHandler](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-ann-exceptionhandler)
    *   [HandlerExceptionResolver](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers)
*   Examples of `ErrorMessageFactory` implementations:
    *   [HttpMediaTypeNotSupportedExceptionErrorMessageFactory](https://gist.github.com/3104749#file_http_media_type_not_supported_exception_error_message_factory.java)
    *   [HttpMessageTypeNotReadableExceptionErrorMessageFactory](https://gist.github.com/3104749#file_http_message_not_readable_exception_error_message_factory.java)
    *   [MethodArgumentNotValidExceptionErrorMessageFactory](https://gist.github.com/3104749#file_method_argument_not_valid_exception_error_message_factory.java)