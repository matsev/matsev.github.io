---
title: Introduction to CloudFormation for API Gateway
excerpt: Blog post that outlines which AWS CloudFormation resources are required to create an AWS API Gateway backed by an AWS Lambda function.
categories: 
    - cloud
tags: 
    - API Gateway
    - AWS
    - cloud
    - CloudFormation
    - Lambda
    - serverless
---


AWS API Gateway and AWS Lambda are part of the [Serverless Architecture](http://martinfowler.com/articles/serverless.html) paradigm shift. The learning curve is steep and for this reason Amazon has a [step-by-step](http://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started.html) tutorial on how to get started. This blog post aims to outline the required AWS resources for a similar project, but this time using AWS CloudFormation instead of the AWS Console for configuration. The sample code is deliberately simplistic, nevertheless I suggest that you start with the AWS tutorial if you have not worked with API Gateway before. If you plan to use this setup in production, I recommend that you study the provided reference documentation carefully so that you do not miss any additional configuration setting that your service may need. The source code is available in my [GitHub repo](https://github.com/matsev/cloudformation-api-gateway).

## Goal

The business logic in this example consists of Lambda function called `GreetingLambda` which has been configured with an appropriate execution role. If the event passed to the Lambda contains a `name` property, a JSON document with a greeting containing the name is returned. If not, the greeting `Hello, World!` is returned.

```javascript
exports.handler = (event, context, callback) => {
  const name = event.name || 'World';
  const response = {greeting: `Hello, ${name}!`};
  callback(null, response);
};
```

When proxied by an API Gateway, it should be possible to perform a HTTP request with the name as a request parameter.

```bash
$ curl https://abc123.execute-api.eu-west-1.amazonaws.com/LATEST/greeting?name=Superman
{"greeting":"Hello, Superman!"}
```

## CloudFormation Resources

#### API Gateway Rest API

First of all, we need to create an API Gateway REST API, a resource that contains a collection API Gateway resources.

```json
"GreetingApi": {
  "Type": "AWS::ApiGateway::RestApi",
  "Properties": {
    "Name": "Greeting API",
    "Description": "API used for Greeting requests",
    "FailOnWarnings" : true
  }
}
```

Ref: [AWS::ApiGateway::RestApi](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html)

#### Lambda Permission

As with all AWS resources, the API Gateway needs permission to execute the Lambda function.

```json
"LambdaPermission": {
  "Type": "AWS::Lambda::Permission",
  "Properties": {
    "Action": "lambda:invokeFunction",
    "FunctionName": {"Fn::GetAtt": ["GreetingLambda", "Arn"]},
    "Principal": "apigateway.amazonaws.com",
    "SourceArn": {"Fn::Join": ["", 
      ["arn:aws:execute-api:", {"Ref": "AWS::Region"}, ":", {"Ref": "AWS::AccountId"}, ":", {"Ref": "GreetingApi"}, "/*"]
    ]}
  }
}
```

Ref: [AWS::Lambda::Permission](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-permission.html)

#### API Gateway Stage

A stage defines the path through which an API deployment is accessible.

```json
"GreetingApiStage": {
  "DependsOn" : ["ApiGatewayAccount"],
  "Type": "AWS::ApiGateway::Stage",
  "Properties": {
    "DeploymentId": {"Ref": "ApiDeployment"},
    "MethodSettings": [{
      "DataTraceEnabled": true,
      "HttpMethod": "*",
      "LoggingLevel": "INFO",
      "ResourcePath": "/*"
    }],
    "RestApiId": {"Ref": "GreetingApi"},
    "StageName": "LATEST"
  }
}
```

Here, CloudWatch logging has been enabled in the `MethodSettings` configuration. I choose to configure `StageName` as `LATEST` to indicate that this stage will target the [$LATEST](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html) version of the Lambda function (which is the default). Ref: [AWS::ApiGateway::Stage](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-stage.html)

#### Logging

It is not enough to just declare logging on the stage as exemplified above. In order to get any CloudWatch logs, you must also specify an IAM role that [enables API Gateway to write information to CloudWatch](http://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-stage-settings.html).

```json
"ApiGatewayCloudWatchLogsRole": {
  "Type": "AWS::IAM::Role",
  "Properties": {
    "AssumeRolePolicyDocument": {
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": ["apigateway.amazonaws.com"] },
        "Action": ["sts:AssumeRole"]
      }]
    },
    "Policies": [{
      "PolicyName": "ApiGatewayLogsPolicy",
      "PolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:DescribeLogGroups",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
            "logs:GetLogEvents",
            "logs:FilterLogEvents"
          ],
          "Resource": "*"
        }]
      }
    }]
  }
}
```

This role must subsequently be passed as a property to the API Gateway Account.

```json
"ApiGatewayAccount": {
  "Type" : "AWS::ApiGateway::Account",
  "Properties" : {
    "CloudWatchRoleArn" : {"Fn::GetAtt" : ["ApiGatewayCloudWatchLogsRole", "Arn"] }
  }
}
```

Ref: [AWS::ApiGateway::Account](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-account.html)

#### API Gateway Deployment

The API Gateway Deployment resource deploys an Amazon API Gateway RestApi resource to a stage so that clients can call the API over the Internet.

```json
"ApiDeployment": {
  "Type": "AWS::ApiGateway::Deployment",
  "DependsOn": ["GreetingRequest"],
  "Properties": {
    "RestApiId": {"Ref": "GreetingApi"},
    "StageName": "DummyStage"
  }
}
```

Note that I have configured of `StageName` as `DummyStage`. This is not a mistake. If you read the documentation of the `StageName` property you will find that:

> _Note_ This property is required by API Gateway. We recommend that you specify a name using any value (see [Examples](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-deployment.html#aws-resource-apigateway-deployment-examples)) and that you don't use this stage. We recommend not using this stage because it is tied to this deployment, which means you can't delete one without deleting the other. For example, if you delete this deployment, API Gateway also deletes this stage, which you might want to keep. Instead, use the [AWS::ApiGateway::Stage](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-stage.html) resource to create and associate a stage with this deployment.

Ref: [AWS::ApiGateway::Deployment](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-deployment.html)

#### API Gateway Resource

Now that we have all the internal bits and pieces setup for the API Gateway, we can start working on the public HTTP parts of the API. In this simplified example, there will only be one endpoint, namely the `/greeting` resource:

```json
"GreetingResource": {
  "Type": "AWS::ApiGateway::Resource",
  "Properties": {
    "RestApiId": {"Ref": "GreetingApi"},
    "ParentId": {"Fn::GetAtt": ["GreetingApi", "RootResourceId"]},
    "PathPart": "greeting"
  }
}
```

The properties are pretty straight forward, we tie the resource to a REST API, we choose a specific parent resource (in this example it is placed directly under the API root) and we define the path part name. Ref: [AWS::ApiGateway::Resource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-resource.html)

#### API Gateway Method

Defining just a resource is not enough, one needs to specify one or more HTTP methods associated with the resource. This turns out to be a verbose exercise and there are more properties available than stated below, see the reference docs for details.

```json
"GreetingRequest": {
  "DependsOn": "LambdaPermission",
  "Type": "AWS::ApiGateway::Method",
  "Properties": {
    "AuthorizationType": "NONE",
    "HttpMethod": "GET",
    "Integration": {
      "Type": "AWS",
      "IntegrationHttpMethod": "POST",
      "Uri": {"Fn::Join" : ["", 
        ["arn:aws:apigateway:", {"Ref": "AWS::Region"}, ":lambda:path/2015-03-31/functions/", {"Fn::GetAtt": ["GreetingLambda", "Arn"]}, "/invocations"]
      ]},
      "IntegrationResponses": [{
        "StatusCode": 200
      }],
      "RequestTemplates": {
        "application/json": {"Fn::Join" : ["", [
          "{",
            "\"name\": \"$input.params('name')\"",
          "}"
        ]]}
      }
    },
    "RequestParameters": {
      "method.request.querystring.name": false
    },
    "ResourceId": {"Ref": "GreetingResource"},
    "RestApiId": {"Ref": "GreetingApi"},
    "MethodResponses": [{
      "StatusCode": 200
    }]
  }
}
```

There is a lot of things going on:

*   The `HttpMethod` tells us that the client will use a HTTP `GET` request to call the resource.
*   The `Type` and `Uri` integration properties has been [configured to target a Lambda function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apitgateway-method-integration.html#cfn-apigateway-method-integration-uri).
*   The `StatusCode`(s) listed in the `IntegrationResponses` are mapped to the corresponding `StatusCode` in the `MethodResponses` (together with other properties that have been omitted in this example).
*   `RequestParameters` declares the name and type of any request parameters. In this example, an optional query string called `name` is defined.
*   `RequestTemplates` is used to convert the incoming request to the format that the Lambda function expects. The value of the `name` query string just mentioned is converted to a JSON document such as `{"name": "Superman"}` that is passed to the Lambda function.

For more information about request and response mappings, see [API Gateway API Request and Response Parameter-Mapping Reference](http://docs.aws.amazon.com/apigateway/latest/developerguide/request-response-data-mappings.html) and [API Gateway API Request and Response Payload-Mapping Template Reference](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html) respectively. Ref: [API::Gateway::Method](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-method.html)

## Test

When an API Gateway is deployed, it gets a root url of the `https://[api-id].execute-api.[region].amazonaws.com` format. If you create a stack that contains all the CloudFormation resources mentioned above (see the [cloudforation.template](https://github.com/matsev/cloudformation-api-gateway/blob/master/cloudformation.template) file in the GitHub sample repo), you can verify that the API Gateway works by issuing a GET request to an endpoint made up of the stage name and resource name appended to the root url (make sure that you use the api-id and region used by your API Gateway, check the Stack Outputs).

```bash
$ curl https://abc123.execute-api.eu-west-1.amazonaws.com/LATEST/greeting
{"greeting":"Hello, World!"}
```

You can also provide a request parameter:

```bash
$ curl https://abc123.execute-api.eu-west-1.amazonaws.com/LATEST/greeting?name=Superman
{"greeting":"Hello, Superman!"}
```

## Considerations

*   An AWS generated domain name may be ok for some applications, but other times a custom domain name is preferred. For the latter case, you may find the article [Use a Custom Domain Name in API Gateway](http://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html) interesting. For CloudFormation configuration you can then look into how a [AWS::ApiGateway::BasePathMapping](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-basepathmapping.html) resource can be configured.
*   An API Gateway Stage corresponds to a version of the API in service. After it has been deployed, it is not possible to modify it. If you find the need for updates, e.g. if you would like to change the request template, you must either deploy a new stage or delete the old stage first in order for the new request mapping to be applied to any request from the clients. This limitation does not apply to Lambda implementation code which can be updated independently of the API Gateway Stage.

## Update

On the November 18th, 2016 AWS introduced the Serverless Application Model (or SAM for short) that provides an alternative solution to the one described in this blog post. Please read the [AWS blog post](https://aws.amazon.com/blogs/compute/introducing-simplified-serverless-application-deplyoment-and-management/) and study the related [project](https://github.com/awslabs/serverless-application-model/blob/master/README.md) at the AWS Labs GitHub account for more information.