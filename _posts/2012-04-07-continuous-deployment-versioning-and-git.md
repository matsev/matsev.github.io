---
title: Continuous Deployment, Versioning and Git
categories:
    - CI/CD
    - Java
tags:
    - CI/CD
    - Git
    - Java
    - Maven
    - Spring 
    - version control
---


So you have heard about continuous delivery and continuous deployment and you are eager to try, but your manager is afraid that you will lose traceability of the project. How can frequent updates of your binaries be tracked in a rapidly progressive environment, where every commit is a potential release?

## Artifact Version vs. Commit

The traditional Java community way of version handling with a three digit number, potentially followed by a build number or a qualifier, e.g. _1.2.3.RELEASE_, works well if you have long development cycles with the occasional bugfix release in between. The problem is that it does not scale when the frequency of releases increases by a magnitude or two. Imagine what your version control system would look like if every commit had its own release branch, or if you manually had to update your dependencies several times daily. Consequently, the notion of snapshot releases has been adopted to indicate that you are working with a moving target. The tradeoff is that the traceability is lost, because one snapshot version refers to many different versions of the software. Different workarounds that allow developers to identify specific snapshots have been introduced to overcome this problem. For example, Maven adds a timestamp when the artifact is [deployed](http://maven.apache.org/plugins/maven-deploy-plugin/examples/disabling-timestamps-suffix.html) to a repository and Jenkins can generate a [fingerprint](https://wiki.jenkins-ci.org/display/JENKINS/Fingerprint) for a binary. Both these methods enable tracking of the _artifact version_ which is good, but they do not tell the complete story. Once you have pinpointed the specific artifact, you need to consult the build log to find out the corresponding _commit_ before you can checkout the code and start debugging. Wouldn't it be nice if you could get the correct source code from the version control system immediately, without the detour to the build log? With Git, a 40 digit [SHA-1](http://en.wikipedia.org/wiki/SHA-1) hash sum is calculated for each commit, making it the perfect candidate to add traceability to your project.

## buildnumber-maven-plugin

It turns out that the [buildnumber-maven-plugin](http://mojo.codehaus.org/buildnumber-maven-plugin/) is the tool for the job. Unfortunately, the documentation on its web page is quite scarce, but we can get some more information by executing the plugin itself:

```bash
$ mvn buildnumber:help
[...]
This mojo is designed to give you a build number. So when you might make 100 builds of version 1.0-SNAPSHOT,
you can differentiate between them all. The build number is based on the revision number retrieved from scm.
[...]
```

You can access the build number in your pom with `${buildNumber}`. Looks promising, we add the following lines to the `<build><plugins>` section in our pom file:

```xml
<plugin>
    <groupid>org.codehaus.mojo</groupid>
    <artifactid>buildnumber-maven-plugin</artifactid>
    <version>1.1</version>
    <executions>
        <execution>
            <phase>validate</phase>
            <goals>
                <goal>create</goal>
            </goals>
         </execution>
    </executions>
</plugin>
```

And then we attempt to validate the project:

```bash
$ mvn validate
[ERROR] Failed to execute goal org.codehaus.mojo:buildnumber-maven-plugin:1.1:create (default)
[...]
Execution default of goal org.codehaus.mojo:buildnumber-maven-plugin:1.1:create failed:
The scm url cannot be null.
```

Ok, the plugin seems to be looking for a [&lt;scm&gt;](http://maven.apache.org/scm/maven-scm-plugin/usage.html#Configuring_SCM) configuration tag in the pom (to be more specific, it is actually looking for a `<scm><connection>` or a `<scm><developerConnection>` tag), let's add one. In order to do that, you also need to add the [Git URLs](http://maven.apache.org/scm/git.html) to your repository:

```xml
<scm>
    <!-- Replace the connection below with your project connection -->
    <connection>scm:git:git://github.com/matsev/git-build-number.git</connection>
</scm>
```

Revalidate the project:

```bash
$ mvn validate
[...]
[INFO] Storing buildNumber: 8ceb5be9376a6ebe34e90d78f57f524d123437a9 at timestamp: 1333643345784
```

Let's compare with the current Git SHA-1:

```bash
$ git show -s
commit 8ceb5be9376a6ebe34e90d78f57f524d123437a9
```

Excellent, now we have a Maven `${buildNumber}` variable with the current Git SHA-1 value that we can use in our project!

## Advertise the Build Number

Now, the question arises how we can utilize the `${buildNumber}` in the best way. The most important thing is to advertise it to your users, let them be a developer of a dependent module, a tester at the Q/A department, a remote client application, a random Internet user or even yourself. Depending on the project type, different suggestions come to mind. I have created a project on [GitHub](https://github.com/matsev/git-build-number) with working implementations of the examples below.

### Manifest Entry

If your users have access to the binary artifact, it can make sense to add the build number as an entry in the project's `MANIFEST.MF` file. For example, the [maven-war-plugin](http://maven.apache.org/plugins/maven-war-plugin/examples/war-manifest-guide.html) can be configured to add a `Git-SHA-1` entry for a _.war_ project:

```xml
<plugin>
    <groupid>org.apache.maven.plugins</groupid>
    <artifactid>maven-war-plugin</artifactid>
    <version>2.1.1</version>
    <configuration>
        <archive>
            <manifest>
                <adddefaultimplementationentries>true</adddefaultimplementationentries>
            </manifest>
            <manifestentries>
                <git-sha-1>${buildNumber}</git-sha-1>
            </manifestentries>
        </archive>
    </configuration>
</plugin>
```

Similarly, you can configure the [maven-jar-plugin](http://maven.apache.org/shared/maven-archiver/examples/manifestEntries.html) to add manifest entry for a _.jar_ project. Note, if your artifact is signed, you should _not_ use the key `SHA1-Digest` as the manifest entry, because it is used during [signature validation](http://docs.oracle.com/javase/7/docs/technotes/guides/jar/jar.html#Signature_Validation).

### Properties File

Alternatively, a simple `buildNumber.properties` file may suit your need:

```properties
git-sha-1=${buildNumber}
```

The file must be [filtered](http://maven.apache.org/plugins/maven-resources-plugin/examples/filter.html) so that the value gets assigned:

```xml
<resources>
    <resource>
        <!-- You may have a different path for your properties file -->
        <directory>${basedir}/src/main/resources</directory>
        <filtering>true</filtering>
    </resource>
</resources>
```

### Static Method Call

If you implemented the property file solution above, you might as well create helper class that wraps the build number in a static method call:

```java
public class PropertiesFileReader {

    private static final Properties properties;

    /** Use a static initializer to read from file. */
    static {
        InputStream inputStream = PropertieFileReader.class.getResourceAsStream("/buildNumber.properties");
        properties = new Properties();
        try {
            properties.load(inputStream);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read properties file", e);
        } finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (IOException e) {
                    // Ignore
                }
            }
        }
    }

    /** Hide default constructor. */
    private PropertiesFileReader() {}

    /**
     * Gets the Git SHA-1.
     * @return A {@code String} with the Git SHA-1.
     */
    public static String getGitSha1() {
        return properties.getProperty("git-sha-1");
    }
}
```

### Web Service Resource

Sometimes your users do not have direct access to your artifacts, but don't let that stop you from sharing the build number. With a little _[insert your favorite web framework here]_ magic, you can publish the build number as a web service resource. Below is an example of a [Spring Controller](http://static.springsource.org/spring/docs/3.1.x/spring-framework-reference/html/mvc.html#mvc-controller):


```java
@Controller
public class BuildNumberController {

    @RequestMapping(value = "/git-sha-1", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public Map<String, String> getGitSha1() {
        String gitSha1 = PropertiesFileReader.getGitSha1();
        return Collections.singletonMap("git-sha-1", gitSha1);
    }
}
```

Put into practice:

```bash
$ curl localhost:8080/build-number/git-sha-1
{"git-sha-1":"8ceb5be9376a6ebe34e90d78f57f524d123437a9"}
```

### Web Projects

If you are a front-end web developer, one option is to embed the build number in the webpage itself, such as in an ever popular about box. A more subtle way is to inline it as an html comment in the `index.html` file:

```html
<!-- Git SHA-1: ${buildNumber} -->
```

Since we are dealing with a web project, the [filtering](http://maven.apache.org/plugins/maven-war-plugin/examples/adding-filtering-webresources.html#Filtering) works differently:

```xml
<groupid>org.apache.maven.plugins</groupid>
<artifactid>maven-war-plugin</artifactid>
<version>2.1.1</version>
<configuration>
    <webresources>
        <webresource>
            <!-- You may have to change the path below if your index.html is located elsewhere -->
            <directory>${basedir}/src/main/webapp</directory>
            <filtering>true</filtering>
        </webresource>
    </webresources>
</configuration>
```

## Wrap Up

Given that you now have a tool for managing artifact versions, should you stop making formal releases of your software? Front end web development is one area where the traditional release management may be questioned. The build server can continuously deploy successful builds to production and yet it is easy to find out exactly which commit that is currently used. Framework development on the other hand is a completely different story, considering the nature of the Java ecosystem where all dependency management rely on stable releases. Additionally, if you need a build number in a human readable format, the Git SHA-1 with its 40-digit string is probably not what you are looking for. The good news is that one solution does not exclude the other. If you would like beta testers to verify critical bug fixes or developers to start using the latest bleeding edge features in a snapshot release, you can benefit from using both the traditional version numbering as well as a commit specific identifier.

## References

*   Example project on [GitHub](https://github.com/matsev/git-build-number)
*   Maven [buildnumber-maven-plugin](http://mojo.codehaus.org/buildnumber-maven-plugin/)
*   The buildnumber-maven-plugin help command `mvn buildnumber:help -Ddetail=true`
*   Maven [&lt;scm&gt;](http://maven.apache.org/scm/maven-scm-plugin/usage.html#Configuring_SCM) configuration
*   Maven `<scm>` [Git URL](http://maven.apache.org/scm/git.html) configuration
*   Configuring a manifest file with aid of the [maven-war-plugin](http://maven.apache.org/plugins/maven-war-plugin/examples/war-manifest-guide.html)
*   Configuring a manifest file with aid of the [maven-jar-plugin](http://maven.apache.org/shared/maven-archiver/examples/manifestSections.html)
*   Using the [maven-resource-plugin](http://maven.apache.org/plugins/maven-resources-plugin/examples/filter.html) to filter resources
*   Using the [maven-war-plugin](http://maven.apache.org/plugins/maven-war-plugin/examples/adding-filtering-webresources.html#Filtering) to filter web resources

## Edit

Oct 15th, 2012: Updated the blog post to include the version 1.1 of the `buildnumber-maven-plugin` because the 1.0 version [had a bug](http://jira.codehaus.org/browse/MBUILDNUM-92) that caused it to fail if executed from another process, e.g. within an IDE. Additionally, the reference project was updated to include all the latest versions of the dependencies and plugins.