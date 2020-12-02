---
title: Serverless Twilio Dictionary
categories: 
    - cloud
    - serverless
tags: 
    - cloud
    - serverless
    - Twilio
---

I recently started working at [Twilio](https://www.twilio.com), a communications company that enables services like voice, text, chat and video globally through APIs. As part of the onboarding process, Twilions (Twilio employees) are encouraged to design and implement an app or service that uses one or more of Twilio's service offerings to get familiarized with the company and to "Wear the customer's shoes" as it is stated in the [company values](https://www.twilio.com/company/values).

## tl;dr

I have implemented a proof of concept project based on [Twilio Functions](https://www.twilio.com/docs/runtime/functions), [Twilio Sync](https://www.twilio.com/sync), [Twilio Phone Numbers](https://www.twilio.com/phone-numbers) and [Twilio Assets](https://www.twilio.com/docs/runtime/assets). The source code is available in my [serverless-twilio-dictionary](https://github.com/matsev/serverless-twilio-dictionary) GitHub repo. 


## Infrastructure

Given my background as a backend developer and serverless proponent I was pleasantly surprised to learn that Twilio offers serverless hosting options. [Twilio Functions](https://www.twilio.com/docs/runtime/functions) is a service similar to AWS Lambda or GCP Cloud Functions, thus capable of handling events so it was an easy pick. Looking further, I decided that my app should have some kind of persistent data storage for retaining data between invocations and [Twilio Sync](https://www.twilio.com/sync) provides just that. To be fair, Sync has more features such as client subscriptions notifications when data is updated, but for me it was more important to get the integration working instead of taking full advantage of all its capabilities. [Twilio Phone Numbers](https://www.twilio.com/phone-numbers) was used as frontend which enabled SMS communication between mobile phone and the function. Lastly, I implemented a landing page for my app using [Twilio Assets](https://www.twilio.com/docs/runtime/assets).

![architecture](/assets/images/serverless-twilio-dictionary-architecture.svg)


## Application

The application is pretty simple. I chose to implement a dictionary with a CRUD (create, read, update and delete) based command interface. The interaction with the Twilio Sync service is handled in the [assets/dictionary.private.js](https://github.com/matsev/serverless-twilio-dictionary/blob/master/assets/dictionary.private.js) file, the SMS message handler is located in the [functions/sms/dictionary.protected.js](https://github.com/matsev/serverless-twilio-dictionary/blob/master/functions/sms/dictionary.protected.js) and the landing page resources are available in the [assets](https://github.com/matsev/serverless-twilio-dictionary/tree/master/assets) folder.

The commands and their syntax that can be used to communicate with the dictionary are explained in the [usage](https://github.com/matsev/serverless-twilio-dictionary#usage) guide in the GitHub readme, in addition to on landing page after the app has been deployed.


## Build Automation

One important aspect of software development for me is build and deployment automation. Although "point and click configuration" in a web UI may work well in some cases (e.g. small project like this one), I prefer to automate and version control these aspects like any other source code. It is quicker and less error prone to execute a script than to manually read, interpret and execute steps in a runbook. Therefore, I spent some time to implement a [setup](https://github.com/matsev/serverless-twilio-dictionary/blob/master/scripts/setup.sh) script as well as a corresponding [teardown](https://github.com/matsev/serverless-twilio-dictionary/blob/master/scripts/teardown.sh) script for this project. All infrastructure is provisioned by executing the former and is subsequently decommissioned when executing the latter.


## References
- [Source code](https://github.com/matsev/serverless-twilio-dictionary) at GitHub
- [Twilio Phone Numbers](https://www.twilio.com/phone-numbers) for registering and managing virtual phone numbers
- [Twilio Functions](https://www.twilio.com/docs/runtime/functions) for backend application hosting 
- [Twilio Sync](https://www.twilio.com/sync) for data persistence 
- [Twilio Assets](https://www.twilio.com/docs/runtime/assets) for hosting web sites
