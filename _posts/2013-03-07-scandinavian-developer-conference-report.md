---
title:  Scandinavian Developer Conference Report
categories:
    - conference
    - events
tags:
    - architecture
    - conference
    - DevOps
    - events
---


co-authors: Johan Haleby and Jan Kronquist

The three of us recently visited Scandinavian Developer Conference in Gothenburg. The location (Svenska Mässan) is huge and we actually got lost on the first day trying to find the conference! However, having a large restaurant and being served at the table during lunch was nice. Besides good food this also created a good opportunity for talking to other participants. Here are some of the highlights of the conference:

## Big Data - Niklas Gustavsson

Niklas Gustavsson talked about how Spotify are handling massive amounts of data "Spotify services, the whole is greater than the sum of the parts". The main points:

*   Create small services that are simple to reason about
*   Use shallow queues, threadpools and connection pools. Don't be afraid of dropping requests as it is better to handle some of the load than none of it. They use ZeroMQ with a queue limit of 32. This creates pushback to the clients and prevents the server from being overloaded.
*   Really happy with PostgreSQL, but due to problems with single master for writes they are using Cassandra in some places
*   Use [boring technology](http://labs.spotify.com/2013/02/25/in-praise-of-boring-technology/) such as DNS SRV records for service discovery
*   Monitor as much as you can and graph your important metrics. Strive for second latency in the graphs. When you have a production problem it is not that interesting what happened 15 minutes ago. Spotify uses [Metrics](http://metrics.codahale.com) for Java metrics and a heavily extended derivative of [Munin](http://munin-monitoring.org/) for graphs.
*   Log what's important. Use a structured format. Use syslog on linux. Collect your logs in a central place (e.g. [Kafka](http://kafka.apache.org/), RSync). Store your logs and make them analayzable (e.g. HDFS Hadoop Distributed File System).
*   Automate deployment and configuration. Spotify uses Debian packages, [Puppet](https://puppetlabs.com/puppet/what-is-puppet) and stores all instance configuration in Git.


## Process - Dan North

Dan North talked about Patterns of Effective Delivery and even though [I've seen](http://vimeo.com/36088613) [this talk](http://dannorth.net/2011/11/20/looking-back-on-2011/) before there were some good memes:

*   Quality should not be uniform! Consider what you are optimizing for. Agile is typically optimizing for predictability.
*   Coupling is the dual of DRY. Violating DRY lead to less coupling.


## Functional - Bodil Stokke

Humorous look at functional programming called [What Every Hipster Should Know About Functional Programming](http://bodil.org/hipster/). We learned about functors, monads, higher order functions and last but not least kleisli triples.


## Big Data - Jonathan Ellis

Jonathan Ellis talked about [Massively Scalable NoSQL with Apache Cassandra](http://www.slideshare.net/jbellis/massively-scalable-nosql-with-apache-cassandra):

*   [Cassandra](http://cassandra.apache.org/) enables its impressive write performance by using append-only writes
*   It doesn't update data or indicies in-place on disk so there’s no intensive synchronous disk operations to block the write
*   [MongoDB](http://www.mongodb.org/) was significantly slower in the benchmarks presented but to be honest I wonder if MongoDB wouldn't have turned out better if it had been using [capped collections](http://docs.mongodb.org/manual/core/capped-collections/) without b-tree indexing.


## Big Data - Jeremy Hinegardner

Jeremy Hinegardner had a good definition of Big Data: "Any amount of data that you feel uncomfortable processing". He also recommended [Avro](http://avro.apache.org/) as a persistence format since it has built in [support for checksums](http://avro.apache.org/docs/current/trevni/spec.html) when serializing data to files.


## Web - Magnus Thor

Magnus Thor presented his work on a [WebRTC](http://en.wikipedia.org/wiki/WebRTC) project called [xsockets](http://www.xsockets.net/). WebRTC seems really cool and allows browser-to-browser communication without going through the server. It can be used for audio and video conferences (like Skype) and it seems pretty simple to use. Of course, Microsoft has it's own take on WebRTC (CU-WebRTC) that doesn't follow the standard...


## Process - Janice Fraser

Janice Fraser keynote about Lean Startup had a useful analogy for finding the minimal product. Instead of creating a extremely elaborate wedding cake (think [American wedding cake](http://www.twcakes.com/gallery/)) you create a [cupcake](http://www.flickr.com/photos/tags/cupcakes/clusters/pink-frosting-sprinkles/). It is not that big, but still something you can eat and may have an [interesting topping](https://www.google.se/search?q=cupcakes&hl=en&tbm=isch). So when building something new you should think "what is the cupcake version of this?".