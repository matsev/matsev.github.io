---
title: AWS Glue Dev Endpoint Deleter
excerpt: Blog post that describes how you can decrease the costs associated with AWS Glue developer endpoint by implementing an AWS Lambda function that deletes them on a scheduled interval.
categories:
    - cloud
    - tools
tags: 
    - AWS
    - AWS Glue
    - cloud
    - CloudFormation
    - Lambda
---


Development of AWS Glue scripts can potentially add unnecessary expenses to your invoice if you are not careful. This blog post shows one way to avoid some of the cost in an automated fashion by using AWS CloudFormation and AWS Lambda.

## Background

A while ago, I had the opportunity to explore [AWS Glue](https://aws.amazon.com/glue/), a serverless extract, transform and load (ETL) service from AWS. The AWS Glue service offering also includes an optional developer endpoint, a hosted [Apache Zeppelin](https://zeppelin.apache.org/) notebook, that facilitates the development and testing of AWS Glue scripts in an interactive manner. Typically, you only pay for the compute resources consumed while running your ETL job. However, in contrast to the rest of AWS Glue family, usage of developer endpoints are charged hourly, regardless if you actively use them or not. You can see this when launching a dev endpoint from the AWS Console:

> Billing for a development endpoint is based on the Data Processing Unit (DPU) hours used during the entire time it remains in the READY state. To stop charges, delete the endpoint. To delete, choose the endpoint in the list, and then choose Action, Delete.

Is this something that we should care about? Each dev endpoint gets 5 DPUs by default (with a minimum of 2 DPUs), and they are currently [priced at $0.44 per DPU-hour](https://aws.amazon.com/glue/pricing/) (billed per second, 10 minutes minimum). Put it differently, you pay $2.20 per hour or $52.80 per day for the default configuration (or more than $100 for a weekend if you forget to delete your endpoint before you go home for the weekend which I did). For me, this was expensive enough to motivate an automatic dev endpoint deleter.

## Outline

The solution consists of the following components:

*   A Lambda function that lists all Glue developer endpoints and subsequently deletes them.
*   A CloudWatch Event that triggers the Lambda function at scheduled intervals (typically at the end of each workday).
*   A Lambda Permission that allows the CloudWatch Event to invoke the Lambda function.
*   An IAM Role that allows the Lambda function to get and delete the Glue developer endpoints.
*   A CloudFormation template that comprises all resources. Thus, the stack can be re-used across AWS accounts and AWS regions.

## Solution

The entire solution is presented in the CloudFormation template below. By inlining the Lambda source code into the template a single file is enough for both the infrastructure as well as the application logic. I have chosen to declare the cron expression as a parameter. I have scheduled the CloudWatch Events to trigger the Lambda when I leave the office, typically at 5PM. Since the cron expression is given in UTC the actual time will depend on daylight saving. A cron expression of `0 16 * * ? *` translates to 5PM CET (Central European Time) in the winter and 6PM CEST (Central European Summer Time) in the summer.

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: Stack that deletes all Glue Developer Endpoints in a region

Parameters:

  CronExpression:
    Type: String
    Description: The cron expression for triggering the Glue Dev endpoint deletion (in UTC)
    Default: 0 16 * * ? *
    ConstraintDescription: Must be a valid cron expression


Resources:

  DeleteGlueEndpointsLambda:
    Type: AWS::Lambda::Function
    Properties:
      Description: A Lambda function that gets and deletes the AWS Glue Dev endpoints
      Handler: index.handler
      Code:
        ZipFile: |
          'use strict';

          const AWS = require('aws-sdk');
          const glue = new AWS.Glue({apiVersion: '2017-03-31'});

          function deleteDevEndpoints(endpointNames) {
            console.info('Deleting Glue DevEndpoints:', JSON.stringify(endpointNames));
            const promises = endpointNames
              .map(params => {
                return glue.deleteDevEndpoint(params).promise()
                  .then(data => {
                    console.info('Deleted:', JSON.stringify(params));
                    return data;
                  });
              });
            return Promise.all(promises);
          }

          function extractEndPointNames(data) {
            return data.DevEndpoints
              .map(({ EndpointName }) => ({ EndpointName }));
          }

          exports.handler = (event, context, callback) => {
            console.info('Event:', JSON.stringify(event));
            glue.getDevEndpoints().promise()
              .then(extractEndPointNames)
              .then(deleteDevEndpoints)
              .then(data => {
                callback(null, data);
              })
              .catch(callback);
          };
      Role: !GetAtt LambdaExecutionRole.Arn
      Runtime: nodejs6.10

  TriggerRule:
    Type: AWS::Events::Rule
    Properties:
      Description: Trigger for the DeleteGlueEndpointsLambda
      ScheduleExpression: !Sub cron(${CronExpression})
      Targets:
      - Arn: !GetAtt DeleteGlueEndpointsLambda.Arn
        Id: TriggerId

  InvokeLambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !GetAtt DeleteGlueEndpointsLambda.Arn
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt TriggerRule.Arn

  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: GlueDeleteEndpointPolicy
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action:
                  - glue:GetDevEndpoint
                  - glue:GetDevEndpoints
                  - glue:DeleteDevEndpoint
                Resource:
                  - '*'
```

## Resources

The AWS documentation is comprehensive, yet it can be hard to navigate. Here are some links that you may find useful:

*   [Schedule Expressions for Rules](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html)
*   [AWS Lambda Permissions Model](https://docs.aws.amazon.com/lambda/latest/dg/intro-permission-model.html)
*   [CloudFormation Resource Types Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html)
*   [Lambda Function Handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html)