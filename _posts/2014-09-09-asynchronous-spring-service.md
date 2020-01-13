---
title: Asynchronous Spring Service
excerpt: An example of how you can implement an asynchronous web server based on Spring 4.0.
categories:
    - Java 
    - web
tags: 
    - asynchronous
    - Java
    - Spring
    - Spring Boot
    - web
---


It is not unusual that your web service needs to communicate with another web service in order to serve its clients. In the old days, that would imply that an incoming request to your server would capture one servlet connection, and perform a blocking call to the remote service before it can send a response to the client. It works, but it does not scale very well if you have multiple concurrent clients. However, as of Servlet 3.0 we have support for asynchronous servlets (see my colleague Henrik's [blog post](https://blog.jayway.com/2014/05/16/async-servlets/)), and as of Servlet 3.1 it also supports [non-blocking I/O](https://blogs.oracle.com/arungupta/entry/what_s_new_in_servlet) which means that we can get a significantly increased throughput.


## Problem

In this blog post, we will implement an asynchronous servlet that talks to a remote server using Spring. For demonstration purposes, [GitHub's repository search API](https://developer.github.com/v3/search/#search-repositories) will be used as the remote service. The problem is basically divided into three main classes:

*   A [GitHubRepoListService](“#remote-server-communication”) has been implemented using the [AsyncRestTemplate](http://docs.spring.io/spring-framework/docs/4.0.x/spring-framework-reference/html/remoting.html#rest-async-resttemplate) to communicate with a remote service.
*   The [RepositoryListDtoAdapter](“#async-response-transformation”) is responsible for converting the response extracted from the `AsyncRestTemplate` from Pojos specific to the GitHub response to other Pojos more suitable for the clients of our service. As such, it also acts as an anti-corruption layer between GitHub and the rest of our service implementation.
*   Lastly, there is the [AsyncController](“#controller”) that is the entry point for our clients.

Of course, the service would not compile without some [glue code](#glue-code) and a [build script](#build-script). For reference, the project is available on [GitHub](https://github.com/matsev/asyncservletdemo).


<a name="remote-server-communication"></a>
## Remote Server Communication

First, we implement a server that uses a [AsyncRestTemplate](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/web/client/AsyncRestTemplate.html) to communicate with GitHub:

```java
@Service
class GitHubRepoListService implements RepoListService {
    private static final String SEARCH_URL = "https://api.github.com/search/repositories?q={query}";

    @Autowired
    private AsyncRestTemplate asyncRestTemplate;

    @Override
    public ListenableFuture<RepoListDto> search(String query) {
        ListenableFuture<ResponseEntity<GitHubItems>> gitHubItems = 
            asyncRestTemplate.getForEntity(QUESTIONS_URL, GitHubItems.class, query);
        return new RepositoryListDtoAdapter(query, gitHubItems);
    }
}
```

The response of the `AsyncRestTemplate` request is a [ListenableFuture](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/util/concurrent/ListenableFuture.html) that eventually will reference a `GitHubItems`, which is then wrapped in a custom `RepositoryListDtoAdapter` that converts it to a `ListenableFuture<RepoListDto>`, see below.


## Asynchronous Object Transformation

If you have not used the `AsyncRestTemplate` or if you are not used to asynchronous Java programming, you may find that transforming one object to another is more complex than one would expect. It may be tempting to just call `gitHubItems.get()` to fetch the response entity and then continue from there, but remember that we are dealing with a future which means that the `get()`method is a blocking call that waits for the future to complete before returning. A better solution is to use the [ListenableFutureAdapter](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/util/concurrent/ListenableFutureAdapter.html) which can then do the transformation in an asynchronous way:

```java
class RepositoryListDtoAdapter extends ListenableFutureAdapter<RepoListDto, ResponseEntity<GitHubItems>> {

    private final String query;

    public RepositoryListDtoAdapter(String query, ListenableFuture<ResponseEntity<GitHubItems>> gitHubItems) {
        super(gitHubItems);
        this.query = query;
    }

    @Override
    protected RepoListDto adapt(ResponseEntity<GitHubItems> responseEntity) throws ExecutionException {
        GitHubItems gitHubItems = responseEntity.getBody();
        List<RepoDto> repoDtos = gitHubItems.items().stream()
            .map(toRepositoryDto).collect(Collectors.toList());
        return new RepoListDto(query, gitHubItems.totalCount(), repoDtos);
    }

    private static Function<GitHubItem, RepoDto> toRepositoryDto = item -> {
        GitHubOwner owner = item.owner();
        return new RepoDto(item.fullName(), item.getUrl(), item.description(),
                            owner.userName(), owner.url(), owner.avatarUrl());
    };
}
```


## Controller

The frontend of our service is a controller that maps incoming requests, extracts the `query` parameter and delegate to the `RepoListService` to do the remote call as described earlier. We need to convert the `ListableFuture` to a [DeferredResult](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/web/context/request/async/DeferredResult.html) before returning it to our clients in order to take advantage of Spring’s [asynchronous request processing](http://docs.spring.io/spring-framework/docs/4.0.x/spring-framework-reference/html/mvc.html#mvc-ann-async) (see also [Considerations](#considerations)). For this reason, we create a [ListenableFutureCallback](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/util/concurrent/ListenableFutureCallback.html) that we add to the `ListenableFuture`:

```java
@RestController
class AsyncController {
    private static final Logger log = LoggerFactory.getLogger(AsyncController.class);

    @Autowired
    private RepoListService repoListService;

    @RequestMapping("/async")
    DeferredResult<ResponseEntity<?>> async(@RequestParam("q") String query) {
        DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>();
        ListenableFuture<RepoListDto> repositoryListDto = repoListService.search(query);
        repositoryListDto.addCallback(
                new ListenableFutureCallback<RepoListDto>() {
                    @Override
                    public void onSuccess(RepoListDto result) {
                        ResponseEntity<RepoListDto> responseEntity = 
                            new ResponseEntity<>(result, HttpStatus.OK);
                        deferredResult.setResult(responseEntity);
                    }

                    @Override
                    public void onFailure(Throwable t) {
                        log.error("Failed to fetch result from remote service", t);
                        ResponseEntity<Void> responseEntity = 
                            new ResponseEntity<>(HttpStatus.SERVICE_UNAVAILABLE);
                        deferredResult.setResult(responseEntity);
                    }
                }
        );
        return deferredResult;
    }
}
```

The `ListenableFutureCallback` interface has two methods that we need to implement. If all goes well, the `onSuccess()` method is called. Consequently, the response that is transformed by the `RepositoryListDtoAdapter` is wrapped in a [ResponseEntity](http://docs.spring.io/spring-framework/docs/4.0.x/javadoc-api/org/springframework/http/ResponseEntity.html) together with a success status, which in turn is passed to the `DeferredResult` instance. If something goes wrong, the `onFailure()` method is called, an empty response entity with a failure status code is created instead.


## Glue Code

Since the project is implemented using Spring Boot, we use a simple `Application` class to configure Spring:

```java
@Configuration
@ComponentScan
@EnableAutoConfiguration
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    AsyncRestTemplate asyncRestTemplate() {
        return new AsyncRestTemplate();
    }
}
```

The rest of the code is basically plumbing to handle the serialization and deserialization of requests and responses. The JSON response from GitHub is mapped to `GitHubItems` by the `AsyncRestTemplate`:

```java
@JsonIgnoreProperties(ignoreUnknown = true)
class GitHubItems {

    @JsonProperty("total_count")
    private int totalCount;

    @JsonProperty("items")
    private List<GitHubItem> items;

    int totalCount() {
        return totalCount;
    }

    List<GitHubItem> items() {
        return items;
    }
}
```

Where `GitHubItem` is implemented like:

```java
@JsonIgnoreProperties(ignoreUnknown = true)
class GitHubItem {

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("html_url")
    private URL url;

    @JsonProperty("description")
    private String description;

    @JsonProperty("owner")
    private GitHubOwner owner;

    String fullName() {
        return fullName;
    }

    URL getUrl() {
        return url;
    }

    String description() {
        return description;
    }

    GitHubOwner owner() {
        return owner;
    }
}
```

and the `GitHubOwner` is implemented as:

```java
@JsonIgnoreProperties(ignoreUnknown = true)
class GitHubOwner {

    @JsonProperty("login")
    private String userName;

    @JsonProperty("html_url")
    private URL url;

    @JsonProperty("avatar_url")
    private URL avatarUrl;

    String userName() {
        return userName;
    }

    URL url() {
        return url;
    }

    URL avatarUrl() {
        return avatarUrl;
    }
}
```

The response that is sent to the client consists of two Pojos. At the top level, there is a `RepoListDto` that contains information about the client's search query, the total number of repositories at GitHub that matched the query and a list of `RepoDto`s that represents each repository:

```java
public class RepoListDto {

    @JsonProperty("query")
    private final String query;

    @JsonProperty("nbr_of_repositories")
    private final int nbrOfRepositories;

    @JsonProperty("repositories")
    private final  List<RepoDto> repositories;

    public RepoListDto(String query, int nbrOfRepositories, List<RepoDto> repositories) {
        this.query = query;
        this.nbrOfRepositories = nbrOfRepositories;
        this.repositories = repositories;
    }
}
```

Each individual GitHub repository is presented as a `RepoDto`:

```java
public class RepoDto {

    @JsonProperty("name")
    private final String name;
    @JsonProperty("url")
    private final URL url;
    @JsonProperty("description")
    private final String description;

    @JsonProperty("owner")
    private final String owner;
    @JsonProperty("owner_url")
    private final URL ownerUrl;
    @JsonProperty("owner_avatar")
    private final URL ownerAvatar;

    public RepoDto(String name, URL url, String description, String owner, URL ownerUrl, URL ownerAvatar) {
        this.name = name;
        this.url = url;
        this.description = description;
        this.owner = owner;
        this.ownerUrl = ownerUrl;
        this.ownerAvatar = ownerAvatar;
    }
}
```


## Build script

The project was built using Maven and the following `pom.xml`:

```xml
<!--?xml version="1.0" encoding="UTF-8"?-->
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemalocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelversion>4.0.0</modelversion>

    <groupid>com.jayway.asyncservlet</groupid>
    <artifactid>demo</artifactid>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>AsyncServlet</name>
    <description>Demo project of how an asynchronous server can use an AsyncRestTemplate</description>

    <parent>
        <groupid>org.springframework.boot</groupid>
        <artifactid>spring-boot-starter-parent</artifactid>
        <version>1.1.6.RELEASE</version>
        <relativepath>
    </relativepath></parent>

    <dependencies>
        <dependency>
            <groupid>org.springframework.boot</groupid>
            <artifactid>spring-boot-starter-web</artifactid>
        </dependency>
        <dependency>
            <groupid>org.apache.httpcomponents</groupid>
            <artifactid>httpasyncclient</artifactid>
        </dependency>
        <dependency>
            <groupid>org.springframework.boot</groupid>
            <artifactid>spring-boot-starter-test</artifactid>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <properties>
        <project.build.sourceencoding>UTF-8</project.build.sourceencoding>
        <start-class>com.jayway.asyncservlet.Application</start-class>
        <java.version>1.8</java.version>
        <servlet-api.version>3.1.0</servlet-api.version>
        <tomcat.version>8.0.12</tomcat.version>
    </properties>

    <build>
        <plugins>
            <plugin>
                <groupid>org.springframework.boot</groupid>
                <artifactid>spring-boot-maven-plugin</artifactid>
            </plugin>
        </plugins>
    </build>
</project>
```


## Considerations

*   In this blog, I have showed how the `AsyncRestTemplate` to communicate with an external restful service. However, before using it in production I suggest that you configure the internals of the `AsyncRestTemplate` such as connection timeout, read timeout, max number of connections, max connections per route etc. The [Apache HttpAsyncClient examples](http://hc.apache.org/httpcomponents-asyncclient-4.0.x/examples.html), [this blog post](http://vincentdevillers.blogspot.fr/2013/10/a-best-spring-asyncresttemplate.html) and [this question on Stack Overflow](http://stackoverflow.com/questions/21943662/how-do-i-set-a-timeout-on-springs-asyncresttemplate) all provide good advice.
*   The asynchronous service will tolerate a much higher load than a synchronous solution would. However, from a client perspective the latency may be an issue since it is first calling your service, which in turn has to call the remote service and wait for its response, before a new response can be created and returned. To mitigate this problem, different cache solutions come to mind. Consider caching the responses from the remote services, caching the Pojos generated by our service and / or using HTTP headers to implement appropriate caching of the responses generated by our service in the HTTP layer.
*   Our asynchronous service is well prepared to handle big load, but is the remote service capable of handling the load you are delegating to it? The suggested cache solution may work if the remote service returns generic answers, but if the remote service returns unique responses for similar requests the cache solution will not do. And what happens if the remote service goes down? One way of handling such requirements, and to protect your server from cascading failures, is to wrap the remote call in a [circuit breaker](http://martinfowler.com/bliki/CircuitBreaker.html).
*   If you can migrate to Spring 4.1 that was released [last week](https://spring.io/blog/2014/09/04/spring-framework-4-1-ga-is-here) you do no longer need to convert your result to `DeferredResult`. Simply return the `ListenableFuture` from your controller (see the [list of improvements](https://spring.io/blog/2014/07/28/spring-framework-4-1-spring-mvc-improvements)).


## Result

The response as returned from GitHub directly:

```bash
$ curl https://api.github.com/search/repositories?q=spring+boot | jq .
{
  "total_count": 883,
  "incomplete_results": false,
  "items": [
    {
      "id": 6296790,
      "name": "spring boot",
      "full_name": "spring-projects/spring-boot",
      "owner": {
        "login": "spring-projects",
        "id": 317776,
        "avatar_url": "https://avatars.githubusercontent.com/u/317776?v=2",
        "gravatar_id": "6f8a529bd100f4272a9ff1b8cdfbd26e",
        "url": "https://api.github.com/users/spring-projects",
        "html_url": "https://github.com/spring-projects",
        "followers_url": "https://api.github.com/users/spring-projects/followers",
        "following_url": "https://api.github.com/users/spring-projects/following{/other_user}",
        "gists_url": "https://api.github.com/users/spring-projects/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/spring-projects/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/spring-projects/subscriptions",
        "organizations_url": "https://api.github.com/users/spring-projects/orgs",
        "repos_url": "https://api.github.com/users/spring-projects/repos",
        "events_url": "https://api.github.com/users/spring-projects/events{/privacy}",
        "received_events_url": "https://api.github.com/users/spring-projects/received_events",
        "type": "Organization",
        "site_admin": false
      },
      "private": false,
      "html_url": "https://github.com/spring-projects/spring-boot",
      "description": "Spring Boot",
      "fork": false,
      "url": "https://api.github.com/repos/spring-projects/spring-boot",
      "forks_url": "https://api.github.com/repos/spring-projects/spring-boot/forks",
      "keys_url": "https://api.github.com/repos/spring-projects/spring-boot/keys{/key_id}",
      "collaborators_url": "https://api.github.com/repos/spring-projects/spring-boot/collaborators{/collaborator}",
      "teams_url": "https://api.github.com/repos/spring-projects/spring-boot/teams",
      "hooks_url": "https://api.github.com/repos/spring-projects/spring-boot/hooks",
      "issue_events_url": "https://api.github.com/repos/spring-projects/spring-boot/issues/events{/number}",
      "events_url": "https://api.github.com/repos/spring-projects/spring-boot/events",
      "assignees_url": "https://api.github.com/repos/spring-projects/spring-boot/assignees{/user}",
      "branches_url": "https://api.github.com/repos/spring-projects/spring-boot/branches{/branch}",
      "tags_url": "https://api.github.com/repos/spring-projects/spring-boot/tags",
      "blobs_url": "https://api.github.com/repos/spring-projects/spring-boot/git/blobs{/sha}",
      "git_tags_url": "https://api.github.com/repos/spring-projects/spring-boot/git/tags{/sha}",
      "git_refs_url": "https://api.github.com/repos/spring-projects/spring-boot/git/refs{/sha}",
      "trees_url": "https://api.github.com/repos/spring-projects/spring-boot/git/trees{/sha}",
      "statuses_url": "https://api.github.com/repos/spring-projects/spring-boot/statuses/{sha}",
      "languages_url": "https://api.github.com/repos/spring-projects/spring-boot/languages",
      "stargazers_url": "https://api.github.com/repos/spring-projects/spring-boot/stargazers",
      "contributors_url": "https://api.github.com/repos/spring-projects/spring-boot/contributors",
      "subscribers_url": "https://api.github.com/repos/spring-projects/spring-boot/subscribers",
      "subscription_url": "https://api.github.com/repos/spring-projects/spring-boot/subscription",
      "commits_url": "https://api.github.com/repos/spring-projects/spring-boot/commits{/sha}",
      "git_commits_url": "https://api.github.com/repos/spring-projects/spring-boot/git/commits{/sha}",
      "comments_url": "https://api.github.com/repos/spring-projects/spring-boot/comments{/number}",
      "issue_comment_url": "https://api.github.com/repos/spring-projects/spring-boot/issues/comments/{number}",
      "contents_url": "https://api.github.com/repos/spring-projects/spring-boot/contents/{+path}",
      "compare_url": "https://api.github.com/repos/spring-projects/spring-boot/compare/{base}...{head}",
      "merges_url": "https://api.github.com/repos/spring-projects/spring-boot/merges",
      "archive_url": "https://api.github.com/repos/spring-projects/spring-boot/{archive_format}{/ref}",
      "downloads_url": "https://api.github.com/repos/spring-projects/spring-boot/downloads",
      "issues_url": "https://api.github.com/repos/spring-projects/spring-boot/issues{/number}",
      "pulls_url": "https://api.github.com/repos/spring-projects/spring-boot/pulls{/number}",
      "milestones_url": "https://api.github.com/repos/spring-projects/spring-boot/milestones{/number}",
      "notifications_url": "https://api.github.com/repos/spring-projects/spring-boot/notifications{?since,all,participating}",
      "labels_url": "https://api.github.com/repos/spring-projects/spring-boot/labels{/name}",
      "releases_url": "https://api.github.com/repos/spring-projects/spring-boot/releases{/id}",
      "created_at": "2012-10-19T15:02:57Z",
      "updated_at": "2014-09-05T09:37:27Z",
      "pushed_at": "2014-09-05T02:22:04Z",
      "git_url": "git://github.com/spring-projects/spring-boot.git",
      "ssh_url": "git@github.com:spring-projects/spring-boot.git",
      "clone_url": "https://github.com/spring-projects/spring-boot.git",
      "svn_url": "https://github.com/spring-projects/spring-boot",
      "homepage": "http://projects.spring.io/spring-boot",
      "size": 46263,
      "stargazers_count": 1028,
      "watchers_count": 1028,
      "language": "Java",
      "has_issues": true,
      "has_downloads": true,
      "has_wiki": true,
      "forks_count": 849,
      "mirror_url": null,
      "open_issues_count": 173,
      "forks": 849,
      "open_issues": 173,
      "watchers": 1028,
      "default_branch": "master",
      "score": 78.31211
    },
    // more repositories...
  ]
}
```

The response that is returned by our service:

```bash
curl http://localhost:8080/async?q=spring+boot | jq .
{
  "query": "spring boot",
  "nbr_of_repositories": 860,
  "repositories": [
    {
      "name": "spring-projects/spring-boot",
      "url": "https://github.com/spring-projects/spring-boot",
      "description": "Spring Boot",
      "owner": "spring-projects",
      "owner_url": "https://github.com/spring-projects",
      "owner_avatar": "https://avatars.githubusercontent.com/u/317776?v=2"
    },
    // more repositories...
  ]
}
```

Side note, [jq](http://stedolan.github.io/jq/) is a convenient tool for JSON processing that you can [install](http://stedolan.github.io/jq/download/).


## References

*   Spring Reference docs [Asynchronous Request Processing](http://docs.spring.io/spring-framework/docs/4.0.x/spring-framework-reference/html/mvc.html#mvc-ann-async).
*   GitHub [search repositories API](https://developer.github.com/v3/search/#search-repositories).
*   GitHub [rate limiting](https://developer.github.com/v3/#rate-limiting).