---
title: Introduction to Swagger for CloudFormation and API Gateway
excerpt: Blog post that outlines how Swagger can be used to configure an AWS API Gateway backed by an AWS Lambda function.
categories:
    - cloud
    - DevOps
    - tools
tags: 
    - API Gateway
    - AWS
    - cloud
    - CloudFormation
    - DevOps
    - Lambda
    - serverless
    - Swagger
---


When I was writing my previous blog post about [Introduction to CloudFormation for API Gateway]({% post_url 2016-08-17-introduction-to-cloudformation-for-api-gateway %}), I noticed that CloudFormation also supports [Swagger](http://swagger.io/) for API Gateway configuration. Curious about what such an implementation would look like in comparison to the previous solution, I decided to give it a go. Like the previous example, consider this blog post and related source code as a proof of concept. If you choose to implement a similar solution, I advise you to study the reference docs using the provided links. The accompanying source code to this blog post can be found in my [GitHub repo](https://github.com/matsev/cloudformation-swagger-api-gateway).

## Goal

The aim of this blog post is to re-implement the very same example as in the [previous post]({% post_url 2016-08-17-introduction-to-cloudformation-for-api-gateway %}), but this time use Swagger configuration instead of CloudFormation resources to configure the REST API. The business logic is an AWS Lambda function called `GreetingLambda` which has been configured with an appropriate execution role. If the event passed to the Lambda contains a `name` property, a JSON document with a greeting containing the name is returned. If not, the greeting `Hello, World!` is returned.

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

Many of the CloudFormation resources will be left untouched from the previous implementation, so I will not describe them again (you will find them in the [cloudformation.template](https://github.com/matsev/cloudformation-swagger-api-gateway/blob/master/cloudformation.template)). Let us focus on the differences instead.

#### API Gateway Rest API

The biggest change is to the `AWS::ApiGateway::RestApi` resource. By configuring the [Body](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html#cfn-apigateway-restapi-body) property it is possible to inline the entire REST API using [Swagger](http://swagger.io/)'s JSON format. As a result, the CloudFormation template as a whole will be less verbose since some other CloudFormation resources can be deleted. That said, it is still a mouthful when you include the [API Gateway Extensions to Swagger](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html) to handle the integration between the API Gateway and other AWS services.

```json
"GreetingApi": {
  "Type": "AWS::ApiGateway::RestApi",
  "Properties": {
    "Name": "Greeting API",
    "Description": "API used for Greeting requests",
    "FailOnWarnings": true,
    "Body": {
      "swagger": "2.0",
      "info": {
        "version": "2016-08-18T18:08:34Z",
        "title": "Greeting API"
      },
      "basePath": "/LATEST",
      "schemes": ["https"],
      "paths": {
        "/greeting": {
          "get": {
            "parameters": [{
              "name": "name",
              "in": "query",
              "required": false,
              "type": "string"
            }],
            "produces": ["application/json"],
            "responses": {
              "200": {
                "description": "200 response"
              }
            },
            "x-amazon-apigateway-integration": {
              "requestTemplates": {
                "application/json": "{\"name\": \"$input.params('name')\"}"
              },
              "uri": {"Fn::Join": ["", [
                "arn:aws:apigateway:",
                {"Ref": "AWS::Region"},
                ":lambda:path/2015-03-31/functions/",
                {"Fn::GetAtt": ["GreetingLambda", "Arn"]},
                "/invocations"]
              ]},
              "responses": {
                "default": {
                  "statusCode": "200"
                }
              },
              "httpMethod": "POST",
              "type": "aws"
            }
          }
        }
      }
    }
  }
}
```
    

Configuration comments:

*   `Body` Root node of the Swagger configuration. Basically a JSON document that conforms to the [Swagger 2.0 Specification](http://swagger.io/specification/).
*   `/greeting` Defines the greeting endpoint and its behavior, e.g. it accepts HTTP `GET` requests, it has an optional query parameter called `name`, it responds with `200 - OK` and the response is in JSON format.
*   [x-amazon-apigateway-integration](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html#api-gateway-swagger-extensions-integration) A big part of the code consists of the configuration that is responsible for mapping and transforming the request and response from the RESTful endpoint to the specified AWS service. It contains several sub-properties, more than the ones listed below.
    *   [requestTemplates](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html#api-gateway-swagger-extensions-integration-requestTemplates) This part of the configuration transforms the incoming request before passing the result downstream då the Lambda function. In this example, the value of the `name` query parameter is transformed into a JSON object that has the format `{"name": "Superman"}`.
    *   `uri` The backend endpoint, here exemplified by the `GreetingLambda` ARN.
    *   [responses](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html#api-gateway-swagger-extensions-integration-responses) Response status patterns from the backend service. Each key has then a `statusCode` property, which in turn must have a matching status code in the Swagger operation `responses`. Put differently, this is the HTTP status code that will be returned to the client. In the sample above, you will see that `default` is used as status pattern and `200` as status code, meaning that the client will always get a `200 - OK` as a result, regardless if the Lambda call was successful or not. This is something you likely want to change in a production project.
    *   `httpMethod` and `type` defaults to HTTP `POST` and `aws` when the API Gateway proxies AWS Lambda.
*   In addition to the `x-amazon-apigateway-integration` object the [API Gateway Extensions to Swagger](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html) also have support for other properties such as custom authorization configuration.

Ref: [AWS::ApiGateway::RestApi](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html)

#### Redundant CloudFormation Resources

By having all the RESTful endpoints declared in Swagger format, one can omit the `AWS::ApiGateway::Resource` and the `AWS::ApiGateway::Method` resources.

## Test

Similarly as in the previous blog post, the API Gateway gets a root url of the `https://[api-id].execute-api.[region].amazonaws.com` format. If you create a stack based on the complete [cloudformation.template](https://github.com/matsev/cloudformation-swagger-api-gateway/blob/master/cloudformation.template) you will see the exact url in the stack output. To verify that the stack works, you have to append the `basePath` and the `/greeting` path to it before issuing a HTTP GET request.

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

*   In this example, the Swagger configuration was inlined in the CloudFormation Template. If you prefer to keep things separate one can upload a Swagger file to S3 and point the [BodyS3Location](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html#cfn-apigateway-restapi-bodys3location) property of the `AWS::ApiGateway::RestApi` to it. One advantage of using this property is that the file can be in either YAML or JSON format. Another benefit of keeping the Swagger configuration separate from the CloudFormation template is that you can pass the very same Swagger file to the client developers and they can use tools such as the [Swagger Code Generator](https://github.com/swagger-api/swagger-codegen#swagger-code-generator) to generate client APIs and documentation. A minor disadvantage is of course that you need keep two files in sync when you deploy a new API Gateway Stage.
*   Swagger enables "contract first design", i.e. you can define a RESTful API before any client or server business logic exists. It is an opinionated way of working and I usually prefer to develop the API and app incrementally. The good news is that Swagger can be used by both parties.
*   It is easy to prototype a new API Gateway using "point and click" in the AWS Console. When you are finished you can choose to [Export an API from API Gateway](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-export-api.html), including the API Gateway Integration, using either a HTTP Get request or the AWS Console. Once you get hold of the Swagger file, you can paste it into your CloudFormation template or save it in an S3 bucket. Preferably, you take the opportunity to do some pruning in the process, for example you can replace any string that contains an AWS region with `{"Ref": "AWS::Region"}`, any string that contains a reference to another CloudFormation resource with `{"Ref": "<logical resource id>"}`, `{"Fn::GetAtt": ["<Lambda logical id>", "Arn"]}` for retrieving a Lambda ARN, etc.