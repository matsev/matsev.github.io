---
title: IntelliJ IDEA performance improvement
categories:
    - Java
    - tools
tags:
    - Idea
    - IntelliJ
    - Java
    - performance
    - tools
---


Working as a consultant, it is not unusual that I am referred to customer specific software environment with regard to computers, operating systems, networks and other configurations. However, since I work with Java, most tools are available online and they can easily be downloaded and installed on different platforms. IntelliJ IDEA is no exception, but before you start coding you should make sure you know how the [home directory](http://en.wikipedia.org/wiki/Home_directory) of your computer is setup and configure IntelliJ IDEA accordingly. From the [documentation](http://devnet.jetbrains.net/docs/DOC-181):

> In some environments user's home directory is located on the mapped network drive which is unacceptable for IntelliJ IDEA. You'll notice the huge performance degradation.

## What is the problem?

There are some good motives for keeping the home directory mounted to a network folder rather than on the local hard drive. For example, all user settings and user documents can be backed up centrally, and the user could potentially log in to any computer and have the same user environment. However, there are also some drawbacks. Depending on how the home folder is configured, there will either be a remote network call for each file access, or the file changes will be executed as a batch job at scheduled intervals or specific events such as logging off the computer. The second part of the problem is that IntelliJ IDEA produces quite a lot of data, typically several hundred megabytes, besides the anticipated artifacts. The data consists of IDE plugins, configuration files, log files, but the vast majority is internal cache files. By default, the data is written to a hidden _.IntelliJIdea10/_ folder in your home directory. If you combine these two factors, the performance will suffer. How much depends on the bandwidth of your network, something that I became painfully aware of when I logged in remotely to the customer's network via a slow VPN connection.

## Solution

Avoid network overhead by configuring IntelliJ IDEA to cache data on your local computer instead of in your home folder. A recent customer used Windows XP as their working environment, the instructions below are based on that experience.

1.  Create a new directory on a _local_ harddrive that IntelliJ IDEA can use, e.g. _C:/.IntelliJIdea10/_. Hint, you cannot create a library starting with a "." from Windows Explorer, you have to use the `mkdir` command from the terminal.
2.  Locate the _idea.properties_ file in the _bin_ directory in IntelliJ IDEA's installation directory. The default location is _C:/Program Files/JetBrains/IntelliJ IDEA Community Edition 10.5.1/bin_.
3.  Change the relevant properties to point to the recently created directory:
    
```properties
# path to IDEA config folder. Make sure you're using forward slashes
idea.config.path=C:/.IntelliJIdea10/config

# path to IDEA system folder. Make sure you're using forward slashes
idea.system.path=C:/.IntelliJIdea10/system

# path to user installed plugins folder. Make sure you're using forward slashes
idea.plugins.path=C:/.IntelliJIdea10/config/plugins
```

## Considerations

Consider _not_ to change the _idea.config.path_ property if you are using several different computers and you would like to have the same configuration on all machines. Additionally, if you are using IntelliJ IDEA Ultimate, i.e. the commercial version of the tool, you should also make a cautious decision about whether or not to keep this property unchanged, because the license file is stored in the denoted directory. On the other hand, if you always use the same computer you might as well change this property together with the other properties, so that all IntelliJ IDEA files are stored in the same location.

## References

*   IDEA files location: [http://devnet.jetbrains.net/docs/DOC-181](http://devnet.jetbrains.net/docs/DOC-181)
*   IDEA license key: [http://devnet.jetbrains.net/docs/DOC-200](http://devnet.jetbrains.net/docs/DOC-200)