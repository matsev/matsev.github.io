---
title: Dynamic FTP Client using Apache Camel and Spring
categories:
    - Java
tags:
    - Apache Camel
    - FTP
    - integration
    - Java
    - Spring
---


I was recently asked to develop an FTP client that could transmit files to various FTP servers as a part of a delivery system in a Java enterprise application. The requirements dictated a flexible implementation:

*   Three different FTP protocols should be supported, namely [FTP](#FTP), [FTPS](#FTPS) and [SFTP](#SFTP)
*   It should be possible to transmit different files to several different servers
*   The files to be sent were generated in runtime, they had different file names and were stored in different directories

Basically, I should implement the following interface:

<a name="FtpSender"></a>
#### FtpSender.java

```java
public interface FtpSender {

    /**
     * Uses the {@code ftpProperties} to transmit the provided {@code file} to a remote server
     *
     * @param ftpProperties The FTP properties of the remote server
     * @param file The file to transmit
     */
    void sendFile(FtpProperties ftpProperties, File file);
}
```

where the FtpProperties was another interface:

#### FtpProperties.java

```java
public interface FtpProperties {

    /**
     * Gets the protocol
     * @return One of {@code ftp}, {@code ftps} or {@code sftp}
     */
    String getProtocol();

    /**
     * Gets the user name
     * @return The name of the user
     */
    String getUserName();

    /**
     * Gets the password
     * @return The password
     */
    String getPassword();

    /**
     * Gets the FTP host
     * @return The FTP host
     */
    String getHost();

    /**
     * Gets the name of the directory on the server where the file will be transferred
     * @return The name of the remote directory
     */
    String getRemoteDirectory();

    /**
     * Gets the passive mode, e.g. if the server is behind a firewall
     * @return whether or not passive mode should be used
     */
    boolean getPassiveMode();
}
```

Rather than implementing the entire FTP client from scratch, I investigated the capabilities of existing frameworks. Most solutions recommend using an existing FTP framework such as [Apache Commons / Jakarta Commons Net](http://commons.apache.org/net/) for FTP and FTPS and then wrap it in a SSH layer like [Jsch / Java Secure Channel](http://www.jcraft.com/jsch/) for SFTP. However, soon I discovered [Apache Camel](http://camel.apache.org/), "a powerful open source integration framework based on known Enterprise Integration Patterns with powerful Bean Integration" (their words). They support a various range of [components](http://camel.apache.org/components.html), anything from XQuery and Atom to XSLT and SQL, just to name a few. To my luck, they also support all three FTP protocols that I needed.

## Fundamentals

What does the [Camel FTP](http://camel.apache.org/ftp2.html) API look like? In its basic form it is a little more than a one-liner:

<a name="FtpRouteBuilder"></a>
#### FtpRouteBuilder.java

```java
public class FtpRouteBuilder extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        from("file://localDirectory").to("ftp://user@host.com/remoteDirectory?password=secret&passiveMode=true");
    }
}
```

So what is going on here? The [RouteBuilder](http://camel.apache.org/routebuilder.html) is one of Camel's core classes that defines the Camel specific [DSL](http://camel.apache.org/dsl.html). In this example, a [Route](http://camel.apache.org/routes.html) from the `localDirectory` to a `remoteDirectory` over FTP with the provided credentials has been created. As can be seen, it is easy to create and configure different endpoints using `String` URIs. It should also be mentioned that it is possible to fetch files from the remote FTP server by swapping the URIs in the `to` and `from` methods. A few more lines are needed to activate the route:

```java
public static void main(String[]args) throws Exception {
    CamelContext camelContext = new DefaultCamelContext();
    try {
        camelContext.addRoutes(new FtpRouteBuilder());
        camelContext.start();
        // do other stuff...
    }
    finally {
        camelContext.stop();
    }
}
```

A [CamelContext](http://camel.apache.org/camelcontext.html) is created for managing the route. The previously described [FtpRouteBuilder](#FtpRouteBuilder) is instantiated and added to the camelContext which is subsequently started. As a consequence, any file that is placed in the "localDirectory" folder will be automatically transferred to the "remoteDirectory" of the FTP server while the program is running.

## Adding Configurability

The requirement of supporting different FTP protocols is solved by changing the URI from `ftp://` to `ftps://` or `sftp://` respectively. It is just as easy to fulfill the second requirement of multiple server support by changing the host, user, port and other parameters of the URI. Likewise, additional settings may be configured by adding more options if needed, see the [Camel FTP](http://camel.apache.org/ftp2.html) documentation.

## Adding Dynamism

The last challenge was to add the dynamic support of selecting source files and destination servers during runtime. The easiest solution is to use another of Camel's base classes, the [ProducerTemplate](http://camel.apache.org/producertemplate.html). Again, the solution is a one-liner:

```java
producerTemplate.sendBodyAndHeader("ftp://user@host.com/remoteDirectory?password=secret", file, Exchange.FILE_NAME, file.getName());
```

The `sendBodyAndHeader()` method name reveals a glimpse of Camel's underlying messaging architecture. The parameters used are the destination URI with additional options, the message body, i.e. the `File` to be sent, a message header parameter that identifies the last parameter as the name of the file it will have on the remote server once it has been transferred.

## Spring Integration

With some refactoring and a little Spring magic we have all the bits and pieces needed to implement the previously defined [FtpSender](#FtpSender) interface:

#### FtpSenderImpl.java

```java
@Service
class FtpSenderImpl implements FtpSender {

    /** Camel URI, format is ftp://user@host/fileName?password=secret&passiveMode=true */
    private static final String CAMEL_FTP_PATTERN = "{0}://{1}@{2}/{3}?password={4}&passiveMode={5}";

    private final ProducerTemplate producerTemplate;

    /**
      * Constructor
      * @param producerTemplate The producer template to be be used
      */
    @Autowired
    FtpSenderImpl(ProducerTemplate producerTemplate) {
        this.producerTemplate = producerTemplate;
    }

    @Override
    public void sendFile(FtpProperties ftpProperties, File file) throws RuntimeException {
        producerTemplate.sendBodyAndHeader(createFtpUri(ftpProperties), file, Exchange.FILE_NAME, fileName);
    }

    /**
      * Creates a Camel FTP URI based on the provided FTP properties
      * @param ftpProperties The properties to be used
      */
    private String createFtpUri(FtpProperties ftpProperties) {
        return MessageFormat.format(CAMEL_FTP_PATTERN,
                ftpProperties.getProtocol(),
                ftpProperties.getUserName(),
                ftpProperties.getHost(),
                ftpProperties.getRemoteDirectory(),
                ftpProperties.getPassword(),
                ftpProperties.getPassiveMode());
    }
}
```

Using the [Camel namespace](http://camel.apache.org/spring.html), the required plumbing work is delegated to the Spring application config:

#### spring-config.xml

```xml
<!--?xml version="1.0" encoding="UTF-8"?-->
<beans xmlns="http://www.springframework.org/schema/beans" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:context="http://www.springframework.org/schema/context" xmlns:p="http://www.springframework.org/schema/p" xmlns:camel="http://camel.apache.org/schema/spring" xsi:schemalocation="
		http://www.springframework.org/schema/beans   http://www.springframework.org/schema/beans/spring-beans-3.0.xsd
		http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context-3.0.xsd
		http://camel.apache.org/schema/spring http://camel.apache.org/schema/spring/camel-spring.xsd">

    <!-- Let Spring create the Camel context and the Camel template, including lifecycle management such as starting and stopping them -->
    <camel:camelcontext id="camelContext">
        <camel:template id="camelTemplate">
    </camel:template></camel:camelcontext>

    <!-- Use Spring component scan to find the FtpSenderImpl implementation -->
    <context:component-scan base-package="com.jayway.ftp">

</context:component-scan></beans>
```

## Conclusions

Camel and Spring provide a simple, yet configurable, way of implementing a dynamic FTP client.

## Acknowledgments

Thanks to Claus Ibsen and other members of the [Apache Camel Forums](http://camel.apache.org/discussion-forums.html) for providing valuable and rapid support.

## Glossary

* <a name="FTP"></a>**FTP** - File Transfer Protocol
* <a name="FTPS"></a>**FTPS** - FTP Secure, is an extension to FTP that adds support for the TLS, Transport Layer Security, and the SSL, Secure Sockets Layer, cryptographic protocols
* <a name="SFTP"></a>**SFTP** - SSH File Transfer Protocol, i.e. FTP over the Secure Shell protocol

## References

* [Camel API](http://camel.apache.org/maven/camel-2.2.0/camel-core/apidocs/index.html)
* [Camel Components](http://camel.apache.org/components.html) 
* [Camel FTP](http://camel.apache.org/ftp2.html)
* [Camel ProducerTemplate](http://camel.apache.org/producertemplate.html) 
* [Camel Spring](http://camel.apache.org/spring.html)
* [Camel ProducerTemplate and Spring](http://camel.apache.org/why-does-camel-use-too-many-threads-with-producertemplate.html)
* [Camel Enterprise Integration Patterns](http://camel.apache.org/enterprise-integration-patterns.html)
* [Camel Forums](http://camel.apache.org/discussion-forums.html)