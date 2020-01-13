---
title: About ExecutorServices
excerpt: Discussion about how a dynamic ThreadPoolExecutor can be implemented that increase the number of worker threads used before it starts queueing tasks.
categories:
    - Java
    - concurrency
tags: 
    - asynchronous
    - concurrency
    - Java
    - threading
--- 


Dealing with asynchronous programming is not easy, at least not if you are a Java programmer. Not only do you have to take care of [Callable](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Callable.html)s, [Runnable](http://docs.oracle.com/javase/7/docs/api/java/lang/Runnable.html)s, [Future](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Future.html)s and likes, you also need to configure the details of how they should be executed by providing an [ExecutorService](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ExecutorService.html). The [Executors](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Executors.html) class provides some static factory methods that can be used, at the expense of being less configurable.

## Cached Thread Pool

If you have short-lived asynchronous tasks, you may find the `Executors.newCachedThreadPool()` appealing. The [JavaDoc](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Executors.html#newCachedThreadPool()) states that:

> Calls to execute will reuse previously constructed threads if available. If no existing thread is available, a new thread will be created and added to the pool. Threads that have not been used for sixty seconds are terminated and removed from the cache. Thus, a pool that remains idle for long enough will not consume any resources.

A major consideration before choosing this solution is that the executor service may spawn _many_ threads. If the application receives 1000 tasks simultaneously, then you may find that you have 1000 threads in your thread pool if the first task did not finish before the last task was submitted. This may cause an undesired load on the deployment environment, or a remote environment that may be targeted by the asynchronous tasks.

## Fixed Thread Pool

Another option is to create a thread pool with a fixed number of threads calling the `Executors.newFixedThreadPool(nThreads)`, where `nThreads` is an integer that specifies the number of threads. The usage is described in the [JavaDoc](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Executors.html#newFixedThreadPool(int)):

> Creates a thread pool that reuses a fixed number of threads operating off a shared unbounded queue. At any point, at most nThreads threads will be active processing tasks. If additional tasks are submitted when all threads are active, they will wait in the queue until a thread is available.

A common pattern is to let `nThreads` equal the number of cores available if the tasks are computational heavy and do not involve I/O. For tasks that have a more asynchronous nature, e.g. they must wait for a remote network call to complete, `nThreads` can be increased, see [Sizing Thread Pools](#sizing-thread-pools) below. The trade-off is that the dynamic nature of the cached thread pool is sacrificed with a fixed pool size that will always occupy the specified resources, even if all threads potentially will idle indefinitely. On the other hand, the load will never sprint unpredictably when things get busy, because new tasks will be added to the internal queue if no thread is available.

## ThreadPoolExecutor

How do you solve a problem that involves infrequent bursts of I/O related tasks? Neither the unpredictable load of the cached thread pool, nor the fixed thread pool where threads idle waiting seems like ideal implementations. The desired solution may be something like "an executor service that grows to a maximum of 20 threads, that will be cached for maximum 60 seconds when idle before termination, and let a blocking queue handle remaining tasks while waiting for a thread to become available". The first naive solution may be to instantiate a `ThreadPoolExecutor` like:

```java
int corePoolSize = 0;
int maximumPoolSize = 20;
long keepAliveTime = 60L
BlockingQueue workQueue = new LinkedBlockingQueue<>();

ExecutorService executorService = new ThreadPoolExecutor(
    corePoolSize, maximumPoolSize, keepAliveTime, TimeUnit.SECONDS, workQueue); 
```

However, when studying the details of the [JavaDoc](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ThreadPoolExecutor.html) one realizes that this solution works, but not quite in the way we wanted. The devil is in the details:

> If there are more than corePoolSize but less than maximumPoolSize threads running, a new thread will be created only if the queue is full.

In practice, this means that it is likely that the executor service's internal thread pool created above never will grow bigger than one, because the pool will not spawn new threads until the queue is full (which, given that the [LinkedBlockingQueue](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/LinkedBlockingQueue.html) has an internal capacity of [Integer.MAX_VALUE](http://docs.oracle.com/javase/7/docs/api/java/lang/Integer.html#MAX_VALUE) may never happen).

## Dynamic ThreadPoolExecutor

Is there a way to make the number of threads grow _first_, and postpone putting tasks on the queue until _after_ all threads have been created and are busy executing tasks? Yes, but it is not as straight forward as one would wish: First, find the [ThreadPoolExecutor.allowCoreThreadTimeOut(boolean)](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ThreadPoolExecutor.html#allowCoreThreadTimeOut(boolean)) method:

> Sets the policy governing whether core threads may time out and terminate if no tasks arrive within the keep-alive time, being replaced if needed when new tasks arrive. When false, core threads are never terminated due to lack of incoming tasks. When true, the same keep-alive policy applying to non-core threads applies also to core threads.

Next, return to the [JavaDoc](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ThreadPoolExecutor.html) of the class:

> A ThreadPoolExecutor will automatically adjust the pool size [...] according to the bounds set by corePoolSize [...] and maximumPoolSize [...]. When a new task is submitted in method execute(java.lang.Runnable), and fewer than corePoolSize threads are running, a new thread is created to handle the request, even if other worker threads are idle.

Combining these two findings programmatically can look something like:

```java
int corePoolSize = 20;
int maximumPoolSize = 20;
long keepAliveTime = 60L
BlockingQueue workQueue = new LinkedBlockingQueue<>();

ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(
    corePoolSize, maximumPoolSize, keepAliveTime, TimeUnit.SECONDS, workQueue);
threadPoolExecutor.allowCoreThreadTimeOut(true); 
```

Two things have been changed compared to the previous snippet. The `corePoolSize` has been set to the same value as the `maximumPoolSize` and acts as an upper bound of the pool size. A fixed-size thread pool has effectively been created, but it has a twist. The addition of the `allowCoreThreadTimeOut(true)` allows the thread pool to shrink to zero when idle. You may be somewhat disturbed that the `corePoolSize` and the `maximumPoolSize` have the same value, but remember that there is little point of making the `maximumPoolSize` larger since the thread pool will not start to grow until the queue is full. Consequently, the `maximumPoolSize` is irrelevant as long as you have fewer than `corePoolSize + Integer.MAX_VALUE` concurrent tasks to execute.

## Dependent Tasks

In general, it is important to make sure that the tasks that should be executed by the executor service are independent of each other. If not, chances are that the threads that are supposed to execute work start to wait and performance will suffer. If things go really bad all tasks that are currently being executed are blocked, and the task that will resolve the knot is stuck in the queue, forever waiting for a thread to become available. A special case of dependent tasks are tasks that can be divided into smaller tasks recursively, and then the final result can be aggregated from the partial results. The [ForkJoinPool](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ForkJoinPool.html) was added to Java 7 for exactly this purpose. More details can be found in the and the [Fork/Join framework tutorial](http://docs.oracle.com/javase/tutorial/essential/concurrency/forkjoin.html).

## Sizing Thread Pools

In the book [Java Concurrency in Practice](http://www.amazon.com/Java-Concurrency-Practice-Brian-Goetz/dp/0321349601), Ch. "8.2 Sizing thread pools", it is stated that the optimal pool size for a desired utilization can be calculated as:

> Nthreads = Ncpu * Ucpu * (1 + W/C)

where

*   Ncpu is the number of CPUs (available through [Runtime.getRuntime().availableProcessors()](http://docs.oracle.com/javase/7/docs/api/java/lang/Runtime.html#availableProcessors%28%29))
*   Ucpu is the target CPU utilization (between 0 and 1)
*   W/C is the ratio of wait time to compute time

For heavy computations without blocking or I/O, where a 100% utilization is desired, this can be simplified to Nthreads = Ncpu. The idea is that creating more threads than CPUs will decrease the performance because of context switching and increased memory consumption.

## Acknowledgements

Thanks to [Anders Göransson](author/andersgoransson/) (author of [Efficient Android Threading](http://shop.oreilly.com/product/0636920029397.do)) and [Albin Theander](author/albintheander/) for feedback.

## References

*   [Thread Pools](http://docs.oracle.com/javase/tutorial/essential/concurrency/pools.html) Java Tutorial
*   [ExecutorService](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ExecutorService.html) JavaDoc
*   [Executors.newCachedThreadPool()](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Executors.html#newCachedThreadPool()) JavaDoc
*   [Executors.newFixedThreadPool(int)](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Executors.html#newFixedThreadPool(int)) JavaDoc
*   [ThreadPoolExecutor](http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/ThreadPoolExecutor.html) JavaDoc
*   [Fork/Join](http://docs.oracle.com/javase/tutorial/essential/concurrency/forkjoin.html) Java Tutorial
*   [Java Concurrency in Practice](http://www.amazon.com/Java-Concurrency-Practice-Brian-Goetz/dp/0321349601)