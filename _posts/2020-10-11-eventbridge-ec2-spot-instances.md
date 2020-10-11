---
title: EventBridge and EC2 Spot Instances
categories: 
    - cloud
    - serverless
tags: 
    - AWS
    - cdk
    - cloud
    - EventBridge
    - Lambda
    - serverless
    - spot instance
---

In a recent project, we were using [AWS EC2 Spot instances](https://aws.amazon.com/ec2/spot/) as part of our cloud test environment. A good solution which catered for cost savings, but as expected the instances were interrupted from time to time. One limitation was that we did not know _why_ the instance stopped, was it manually terminated, stopped by an application error or was it an EC2 spot interruption? This blog post shows how [Amazon EventBridge](https://aws.amazon.com/eventbridge/) can be configured to trigger a simple Lambda function when spot instances are interrupted.


## Introduction

In case you are not familiar with EventBridge, here is a paragraph copied from its [product page](https://aws.amazon.com/eventbridge/): 
> Amazon EventBridge is a serverless event bus that makes it easy to connect applications together using data from your own applications, integrated Software-as-a-Service (SaaS) applications, and AWS services. EventBridge delivers a stream of real-time data from event sources, such as Zendesk, Datadog, or Pagerduty, and routes that data to targets like AWS Lambda. You can set up routing rules to determine where to send your data to build application architectures that react in real time to all of your data sources. 
 
As can be seen, EventBridge is a versatile and powerful tool. In this particular example, we will see how it can be used for the specific purpose of detecting EC2 Spot instance interruptions.
 


## Infrastructure

The two main components of the infrastructure is one [EventBridge Rule](https://docs.aws.amazon.com/eventbridge/latest/userguide/create-eventbridge-rule.html) and a Lambda function that is triggered when an event is matched by the rule. Using the [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html), it is a pretty straight forward configuration:

```typescript
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as logs from "@aws-cdk/aws-logs";
import * as events from '@aws-cdk/aws-events';
import * as eventsTargets from '@aws-cdk/aws-events-targets'


export class SpotInstantceEventDetectorStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function that will triggered
    const spotInstanceEventLambda = new lambda.Function(this, 'SpotInstanceEventLambda', {
      description: 'Handles Spot Instance events',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: new lambda.AssetCode('lambdas'),
      handler: 'spot-instance-event-lambda.handler',
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    // Events Rule that will trigger the Lambda when an EC2 interruption event occurs
    new events.Rule(this, 'SpotInstanceEventRule', {
      description: 'Rule for tracking spot instance interruptions',
      eventPattern: {
        source: ['aws.ec2'],
        detailType: ['EC2 Spot Instance Interruption Warning'],
      },
      targets: [new eventsTargets.LambdaFunction(spotInstanceEventLambda)],
    });
  }
}
```  

Apart from the EventBridge Rule and the Lambda function, three(*) more AWS resources are generated, one IAM role that is configured with the `AWSLambdaBasicExecutionRole` (thus allowing the Lambda to log to CloudWatch), a [Lambda Permission](https://docs.aws.amazon.com/lambda/latest/dg/lambda-permissions.html) that allows EventBridge to invoke the Lambda and lastly a `CDKMetadata` resource that, as the name implies, contains metadata about the CDK. 

(*) Actually, with the `logRetention` configuration in place there are yet another four resources created. This setting causes the CDK to configure the Lambda CloudWatch log retention policy using a custom resource with another Lambda function, an IAM Role and an IAM Policy.


## Events, Event Filters and Event Targets

In the sample above, events are filtered using the `eventPattern` configuration part of the event rule. All AWS event have the same [event structure](https://docs.aws.amazon.com/eventbridge/latest/userguide/aws-events.html) and here we use the `source` and `detailType` as [event pattern](https://docs.aws.amazon.com/eventbridge/latest/userguide/filtering-examples-structure.html) to filter out the Spot instance interruption events. Please see the EventBridge user guide for a comprehensive list of [Event Examples from Supported AWS Services](https://docs.aws.amazon.com/eventbridge/latest/userguide/event-types.html). 
Going further the `targets` property have been configured with the Lambda function. It should be noted that there are many more [EventBridge Targets](https://docs.aws.amazon.com/eventbridge/latest/userguide/eventbridge-targets.html) to choose from, such as Kinesis, StepFunctions, API Gateway and so on.


## Application Code

In its simplest form, the Lambda function logs the important parts of the spot instance interruption events to CloudWatch:

```javascript
exports.handler = (event) => {
  const { time, region, detail: { 'instance-id': instanceId, 'instance-action': instanceAction } } = event;

  console.info(JSON.stringify({ time, region, instanceId, instanceAction }));
};
```

Now, how would you like to be notified? What is important for your service? Perhaps logging to CloudWatch like above will suffice? Maybe it makes sense to store the events in DynamoDB? Or perhaps send a Slack notification? Different teams and different projects have different requirements, but this gives you a good starting point for further endeavours. 


## References

* [Example Project at GitHub](https://github.com/matsev/spot-instance-event-detector)
* [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/)
* [Spot Instance interruptions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-interruptions.html)
* [AWS Events](https://docs.aws.amazon.com/eventbridge/latest/userguide/aws-events.html)
* [Event Patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/filtering-examples-structure.html)
* [EventBridge Targets](https://docs.aws.amazon.com/eventbridge/latest/userguide/eventbridge-targets.html)
* [EventBridge Event Examples from Supported AWS Services](https://docs.aws.amazon.com/eventbridge/latest/userguide/event-types.html).
* [Taking Advantage of Amazon EC2 Spot Instance Interruption Notices](https://aws.amazon.com/blogs/compute/taking-advantage-of-amazon-ec2-spot-instance-interruption-notices/)
