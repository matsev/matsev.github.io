---
title: Continuous Deployment of AWS Lambda behind API Gateway
excerpt: Blog about how bash scripts can be used for continuous deployment of an AWS Lambda that is behind an API Gateway. Contains links to GitHub sample project.
categories: 
    - cloud
    - DevOps
    - testing
tags: 
    - API Gateway
    - AWS
    - bash
    - CI/CD
    - cloud
    - CloudFormation
    - DevOps
    - Lambda
    - serverless
---


In two previous blog posts I started by introducing scripts for [Continuous Deployment on AWS Lambda]({% post_url 2016-07-07-continuous-deployment-on-aws-lambda %}) and then I continued to experiment with [Introduction to CloudFormation for API Gateway]({% post_url 2016-08-17-introduction-to-cloudformation-for-api-gateway %}). This blog post will be a continuation of both of them. You will see an example of how continuous deployment of an AWS Lambda function behind an AWS API Gateway may look like in a CloudFormation setup. All implementation details can found in the [sample repository](https://github.com/matsev/api-gateway-continuous-deployment) at GitHub if you are interested.

## Goal

By revisiting the [first blog post]({% post_url 2016-07-07-continuous-deployment-on-aws-lambda %}), you can see an example of how [AWS Lambda Function Versioning and Aliases](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html) can be used to implement continuous delivery on Lambda. In short, two different Lambda alias, `STAGE` and `PROD`, were used as two different deployment targets for the Lambda function. Some scripts were developed that first executed unit tests of the Lambda source code, zipped the Lambda source code to a new package that was deployed a new Lambda version and updated the Lambda `STAGE` alias if the Lambda integration tests passed. In the [second blog post]({% post_url 2016-08-17-introduction-to-cloudformation-for-api-gateway %}), I showed how CloudFormation can be used to configure an API Gateway backed by a Lambda function. This blog post aims to combine the two previous blog posts to create two API Gateway stages, the first named `stage`, the second named `prod`, that will be mapped to each Lambda alias respectively. In addition, new integration tests should be developed that verify that the RESTful API works as expected.

## CloudFormation Resources

Some changes to the CloudFormation template are required in order to make the continuous deployment work. The final result can be found in the [cloudformation.template](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/cloudformation.template) at GitHub.

#### Lambda Aliases

As with any other AWS resource, one must add permission before a Lambda function can be called. More to the point, in the [Versioning, Aliases, and Resource Policies](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases-permissions.html) section of the AWS Lambda Developer Guide, it is stated that one must add a permission based on the Lambda alias ARN in order to invoke the Lambda using an alias name. Any attempt to use a permission based on the unqualified Lambda ARN will result in a permission error. For this reason two `AWS::Lambda::Alias` resources are created up front that will be used later when creating the Lambda permissions.

```json
"GreetingStageLambdaAlias": {
  "Type" : "AWS::Lambda::Alias",
  "Properties" : {
    "FunctionName" : {"Ref": "GreetingLambda"},
    "FunctionVersion" : "$LATEST",
    "Name" : "STAGE"
  }
},

"GreetingProdLambdaAlias": {
  "Type" : "AWS::Lambda::Alias",
  "Properties" : {
    "FunctionName" : {"Ref": "GreetingLambda"},
    "FunctionVersion" : "$LATEST",
    "Name" : "PROD"
  }
}
```
        

Both aliases reference the same Lambda `FunctionName`, but they have different alias `Name`s. The `FunctionVersion` has been set to `$LATEST` version which means that both alias will point to the [latest Lambda version](http://docs.aws.amazon.com/lambda/latest/dg/aliases-intro.html) after the initial stack deployment. Later, the aliases will be updated by the continuous deployment scripts to point to new versions. Ref: [AWS::Lambda::Alias](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-alias.html)

#### Lambda Permissions

After the aliases have been created, two `AWS::Lambda::Permission`s are created to allow the API Gateway to call both `GreetingLambda:STAGE` and `GreetingLambda:PROD` alias.

```json
"GreetingLambdaStagePermission": {
  "Type": "AWS::Lambda::Permission",
  "Properties": {
    "Action": "lambda:invokeFunction",
    "FunctionName": {"Ref": "GreetingLambdaStageAlias"},
    "Principal": "apigateway.amazonaws.com",
    "SourceArn": {"Fn::Join": ["",
      ["arn:aws:execute-api:", {"Ref": "AWS::Region"}, ":", {"Ref": "AWS::AccountId"}, ":", {"Ref": "GreetingApi"}, "/*"]
    ]}
  }
},

"GreetingLambdaProdPermission": {
  "Type": "AWS::Lambda::Permission",
  "Properties": {
    "Action": "lambda:invokeFunction",
    "FunctionName": {"Ref": "GreetingLambdaProdAlias"},
    "Principal": "apigateway.amazonaws.com",
    "SourceArn": {"Fn::Join": ["",
      ["arn:aws:execute-api:", {"Ref": "AWS::Region"}, ":", {"Ref": "AWS::AccountId"}, ":", {"Ref": "GreetingApi"}, "/*"]
    ]}
  }
}
```        

Note that we pass references to the two Lambda aliases instead of the Lambda resource as `FunctionName` values. Ref: [AWS::Lambda::Permission](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-permission.html)

#### API Gateway Stages

Now we have all required components to create the API Gateway stages. They are very similar to the example developed in the previous blog post, but with one important distinction. By defining a [Stage Variables](http://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html) called `LambdaAlias` we can add a value for mapping the Lambda alias later on. Stage variables act as environment variables in your API Gateway configuration. You can use whatever variable name and value that you like, as long as you use the [allowed characters](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-stage.html#cfn-apigateway-stage-variables). Please see [API Gateway Stage Variables Reference](http://docs.aws.amazon.com/apigateway/latest/developerguide/aws-api-gateway-stage-variables-reference.html) for details and use cases of how stage variables can be used.

```json
"GreetingApiStageStage": {
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
    "StageName": "stage",
    "Variables": {
      "LambdaAlias": "STAGE"
    }
  }
},

"GreetingApiProdStage": {
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
    "StageName": "prod",
    "Variables": {
      "LambdaAlias": "PROD"
    }
  }
},
```        

#### API Gateway Method

The last change of the CloudFormation template compared to the previous blog post is in the API Gateway method resource where the HTTP method is mapped to the Lambda function. Previously, the [API Gateway Uri](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apitgateway-method-integration.html#cfn-apigateway-method-integration-uri) was "just" a magic string including the Lambda ARN. With the addition of the `${stageVariables.LambdaAlias}` stage variable to provide the Lambda alias the string becomes even more magic. Depending on which API Gateway stage is being called, the stage variable will be evaluated to `STAGE` and `PROD` respectively, thus directing the request to the matching Lambda alias. Please see the [AWS Integration URIs (Lambda Functions)](http://docs.aws.amazon.com/apigateway/latest/developerguide/aws-api-gateway-stage-variables-reference.html#stage-variables-in-integration-lambda-functions) for more details on how this works.

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
        ["arn:aws:apigateway:",
        {"Ref": "AWS::Region"},
        ":lambda:path/2015-03-31/functions/",
        {"Fn::GetAtt": ["GreetingLambda", "Arn"]},
        ":${stageVariables.LambdaAlias}",
        "/invocations"]
      ]},
      "IntegrationResponses": [{
        "StatusCode": 200
      }],
      "RequestTemplates": {
        "application/json": {"Fn::Join" : ["", [
          "{",
          "  \"name\": \"$input.params('name')\"",
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

## Tests

After the CloudFormation template, the application can be tested in three different levels. First of all, there is the [unit test](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/test/greeter-test.js) at the JavaScript level (executor [1-test.sh](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/scripts/1-test.sh)). Next level [tests the Lambda function](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/itest-lambda/greeting-lambda-test.js) using the AWS JavaScript SDK after a new Lambda function has been updated (executor [4-lambda-itest.sh](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/scripts/4-lambda-itest.sh)) and acts as a gatekeeper whether or not the Lambda alias should be updated. The last level of [integration tests](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/itest-api-gateway/greeting-rest-test.js) uses a REST client to send requests to the API Gateway and validates the responses (executor [7-api-gateway-itest.sh](https://github.com/matsev/api-gateway-continuous-deployment/blob/master/scripts/7-api-gateway-itest.sh)).

## Consideration

The continuous integration flow has only been configured to update the Lambda implementation and not the API Gateway stage. Consequently, if you update your Lambda function in a way that requires changes to the API Gateway integration request or response mapping, the REST client integration tests will not work, despite appropriate updates. The cause of this error is that once the API Gateway stage has been been deployed, it cannot be updated. If you find the need for such update, you must either deploy a new stage, or delete the existing stage, make the necessary changes and re-deploy it.

## Update

On the November 18th, 2016 AWS introduced the Serverless Application Model (or SAM for short) that provides an alternative solution to the one described in this blog post. Please read the [AWS blog post](https://aws.amazon.com/blogs/compute/introducing-simplified-serverless-application-deplyoment-and-management/) and study the related [project](https://github.com/awslabs/serverless-application-model/blob/master/README.md) at the AWS Labs GitHub account for more information.