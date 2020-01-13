---
title: Spring Boot Custom HealthIndicator
excerpt: Example of you can implement a custom HealthIndicator for Spring Boot. In particular, the example shows how you can make sure that there is disk space left.
categories: 
    - DevOps
    - Java
    - web
tags:
    - DevOps
    - Java
    - Spring
    - Spring Boot
    - web
---


A big part of the DevOps responsibilities is to monitor and maintain the health of running servers. If a production server goes down, appropriate actions must be undertaken to bring the service back to life. However, before any resurrection, one must know that the server is malfunctioning in the first place. In an automated cloud environment, this can be handled by a load balancer calling a known endpoint. For this reason, Spring Boot has a [/health](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#production-ready-endpoints) endpoint that is part of its [Actuator](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#production-ready) features. In this blog post, we will see how a custom health indicator can be implemented that adds to the existing `/health` endpoint.

## Not enough space?

A common problem is that you run out of disk space. Spring Boot provides default [log rotation](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#boot-features-logging), however there might be an access log, a database log, environment changes, and what not. Over time, even small log statements will eat up the disk space. More often than not, the problem manifests itself in production. The same problem is probably present in test and staging environments as well, but typically these environments are restarted more frequently (opportunity for clearing logs) and they are subject to less load (fewer actions logged). The idea with a custom `DiskSpaceHealthIndicator` is to provide a heads up warning before the server runs out of space completely.

## Implementation

A custom `HealthIndicator` that checks the available disk space can be implemented as follows:

```java
@Component
public class DiskSpaceHealthIndicator extends AbstractHealthIndicator {


    private final FileStore fileStore;
    private final long thresholdBytes;

    @Autowired
    public DiskSpaceHealthIndicator(@Value("${health.filestore.path:${user.dir}}") String path,
                                    @Value("${health.filestore.threshold.bytes:10485760}") long thresholdBytes) throws IOException {
        fileStore = Files.getFileStore(Paths.get(path));
        this.thresholdBytes = thresholdBytes;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) throws Exception {
        long diskFreeInBytes = fileStore.getUnallocatedSpace();
        if (diskFreeInBytes >= thresholdBytes) {
            builder.up();
        } else {
            builder.down();
        }
    }
}
```

Note that this example is based on Spring Boot version 1.1+, because the `HealthIndicator` interface was changed as part of the [Spring Boot 1.1](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-1.1-Release-Notes#healthindicators) release. When tested, the application responds appropriately:

```bash
$ curl localhost:8080/health
{"status":"UP"}
```

or if the specified threshold has been exceeded:

```bash
$ curl localhost:8080/health
{"status":"DOWN"}
```

## Explanation

*   Any [HealthIndicator](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/HealthIndicator.html) Spring bean will contribute to the overall health status presented at the `/health` endpoint. The [AbstractHealthIndicator](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/AbstractHealthIndicator.html) implements the interface and provides a convenient [Health.Builder](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/Health.Builder.html) that can be used.
*   Two optional properties have been specified. They have default values, but they can easily be overridden, e.g. by providing appropriate values in the `application.properties` file.
    *   The `${health.filestore.path:${user.dir}}"` specifies the path to the underlying `FileStore`. Here, it defaults to `${user.dir}`, i.e. a [system property](http://docs.oracle.com/javase/tutorial/essential/environment/sysprop.html) that defines the current directory when the JVM was started. You may need to set it to something else, such as the root folder, the folder in which the application is deployed, etc, see considerations below.
    *   The `${health.filestore.threshold.bytes:10485760}` is the amount of free space left in bytes before the health indicator will change its state. In this case 10485760 (10MB) has been set to the default, which gives some space for any services to flush data to their log files despite that the application has become unavailable.
*   The health check itself is trivial, set the status to [Status.UP](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/Status.html#UP) if the available disk is greater than the threshold. If not, set the status to [Status.DOWN](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/Status.html#DOWN)

## HTTP Status Codes

It is possible to change the HTTP status codes of the `/health` response. By default, if the status is `Status.DOWN` or `Status.OUT_OF_SERVICE` HTTP status `503 - Service Unavailable` will be returned. (Please note that in Spring Boot versions <= 1.1.4, there is a [bug](https://github.com/spring-projects/spring-boot/issues/1264) that will cause `200 - OK` to be returned by default.) If you do not like the default HTTP status codes, or if you instantiate your own [Status](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/Status.html), you can add a line in your `application.properties` to configure the desired HTTP status code. For example, if you would like the `Status.DOWN` to return `500 - Internal Server Error`, specify the following:

```properties
endpoints.health.mapping.DOWN: INTERNAL_SERVER_ERROR
```

The key starts with `endpoints.health.mapping` followed by the `code` (case sensitive) that is passed to the [Status](http://docs.spring.io/spring-boot/docs/1.1.x/api/org/springframework/boot/actuate/health/Status.html#Status(java.lang.String)) constructor, and the value a [HttpStatus](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/http/HttpStatus.html) (case insensitive).

## Considerations

*   The application must have read access to the path specified by the `${health.filestore.path:${user.dir}}"` property, otherwise the [Files.getFileStore(Path path)](http://docs.oracle.com/javase/8/docs/api/java/nio/file/Files.html#getFileStore-java.nio.file.Path-) will throw an exception. Likewise, if a security manager has been installed, the [checkRead(String path)](http://docs.oracle.com/javase/8/docs/api/java/lang/SecurityManager.html#checkRead-java.lang.String-) method will be called, potentially resulting in a `SecurityException` being thrown.
*   The [FileStore.getUnallocatedSpace()](http://docs.oracle.com/javase/8/docs/api/java/nio/file/FileStore.html#getUnallocatedSpace--) was used to find out how much disk space is available. As an alternative, one could call the [FileStore.getUsableSpace()](http://docs.oracle.com/javase/8/docs/api/java/nio/file/FileStore.html#getUsableSpace--) method instead that checks only for the available disk for this JVM.
*   The methods of the `FileStore` return hints to the available disk size, but it does not provide any guarantees "that it is possible to use most or any of these bytes", see the [Javadoc](http://docs.oracle.com/javase/8/docs/api/java/nio/file/FileStore.html).
*   The actual data can be presented as part of the `/health` response message, simply add the following lines to the end of the `doHealthCheck()` method above:

    ```java    
    long totalSpaceInBytes = fileStore.getTotalSpace();
    builder.withDetail("disk.free", diskFreeInBytes);
    builder.withDetail("disk.total", totalSpaceInBytes);
    ```

    As a result, any call to the `/health` endpoint will present the current figures:
    
    ```bash
    $ curl localhost:8080/health
    {
       "disk.free" : 389685293056,
       "disk.total" : 499418034176,
       "status" : "UP"
    }
    ```
    
*   Alternatively, if you are more cautious, you can implement the health as it is, and add the actual figures to the `/metrics` endpoint instead, please see the [reference docs](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#production-ready-metrics) for details.

## Update

July 27th, 2014. Changed default path to `${user.dir}`. September 9th, 2014. After publishing this blog post I was [asked](https://twitter.com/cdupuis/status/491687010445590528) to submit a pull request with this feature. [Christian Dupuis](https://twitter.com/cdupuis) reviewed the code, and it was merged into Spring Boot as of [1.2.0.M1](http://spring.io/blog/2014/09/08/spring-boot-1-2-0-m1-available-now). More information can be found in the [Spring Boot 1.2 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-1.2-Release-Notes#diskspacehealthindicator).

## References

*   [Custom health information](http://docs.spring.io/spring-boot/docs/1.1.x/reference/htmlsingle/#production-ready-health)
*   [Spring Boot 1.1 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-1.1-Release-Notes#healthindicators)