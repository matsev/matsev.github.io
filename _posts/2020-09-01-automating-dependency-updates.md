---
title: Automating Dependency Updates
categories: 
    - build automation
    - CI/CD
    - security
tags: 
    - build automation
    - CI/CD
    - Dependabot
    - GitHub
    - security
---

Updating project dependencies is a task that is often neglected, especially in legacy projects that are "done" and just work without changes. It is easy to understand why, without automation it is tedious work that has to be repeated every so often for all of your projects. This post is an introduction to [GitHub's Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-dependencies-updated-automatically) which offloads the repetitive parts of the job to the machines. 


## Motivation

Perhaps the most important reason why you should spend time to keep your third party libraries up to date is that every now and then a new security vulnerability is discovered and your customers, your data and your business may be at stake. By dealing with updates regularly the risk of having a daunting cascade of migrations is mitigated and the workload is distributed over time. Furthermore, with tools such as Dependabot that enables both automation of discovering and execution of dependency version updates there is no excuse why this should be overlooked.


## Step by Step

Updating third party dependencies typically involves the following steps:

1. Check out the project
2. Find out which dependencies that can be updated. Typically, your project management tools can assist, the [Versions Maven Plugin](https://www.mojohaus.org/versions-maven-plugin/index.html) is helpful for Java Maven projects, [yarn upgrade](https://classic.yarnpkg.com/en/docs/cli/upgrade) and [yarn upgrade-interactive](https://classic.yarnpkg.com/en/docs/cli/upgrade-interactive) for JavaScript Yarn to name a few examples
3. Fix API incompatibility issues that the update incurred  
4. Submit a pull request
5. Rebuild and retest the project to verify that there has been no regression
6. Deploy
7. Repeat

Assuming that you already use a build server for continuous integration that takes care of step `5` and possibly also step `6` if you also have continuous deployment in place. With Dependabot configured in the project, steps `1`, `2`, `4` and `7` are also managed automatically. What about step `3`, API incapability issues? It turns out, this is not always a problem. If your dependencies have adopted [semantic versioning](https://semver.org), then you will have a indicator if the update will succeed or fail without code changes. If the new version is just a minor or patch release it is likely to pass. Even if it is a new major version, your code may still work if you are not using the parts of the API with the breaking changes.


## Dependabot Example

This example uses [GitHub's Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-dependencies-updated-automatically) for dependency checks for two reasons. Firstly, it is provided out of the box for GitHub projects. Meaning, you don't have to deploy or manage any infrastructure or build server to make use of it. Secondly, it does not require much configuration to get started:

1. Create a [dependabot.yml](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates#about-the-dependabotyml-file) file in the `.github` folder in your project root
2. specify `version: 2` and an array of `updates` (one configuration for each package manager that you would like to check) 
3. Each update have three required options (there are more, please [configuration options](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates) for an exhaustive list)
  
  | option              | description                                                           | example       |
  | ------------------- | --------------------------------------------------------------------- | ------------- |
  | `package-ecosystem` | Package manager to use                                                | `gradle`      |
  | `directory`         | Location of the package manifest (in relation to the repository root) | `/`           |
  | `schedule.interval` | How often to check for updates                                        | `"weekly"`    |

Thus, a `dependabot.yml` file for a Docker project could look something like:


```yml
version: 2
updates:

  # Enable version updates for Docker
  - package-ecosystem: "docker"
    # Look for a `Dockerfile` in the `root` directory
    directory: "/"
    # Check for updates once a week
    schedule:
      interval: "weekly"
```

There is nothing that prevents Dependabot from checking two (or more) different build systems. For example, this site is built using bundler and GitHub Actions. The corresponding `dependabot.yml` file is in the GitHub [project repo](https://github.com/matsev/matsev.github.io/blob/dev/.github/dependabot.yml) and there is also an example of a [pull request](https://github.com/matsev/matsev.github.io/pull/2) generated by dependabot.


## Alternatives

Two other tools similar to Dependabot are [Snyk](https://snyk.io) and [WhiteSource Renovate](https://renovate.whitesourcesoftware.com)


## References

- [Dependabot supported repositories and ecosystems](https://docs.github.com/en/github/administering-a-repository/about-github-dependabot-version-updates#supported-repositories-and-ecosystems)
- [Configuration options for dependency updates](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates)