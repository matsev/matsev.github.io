---
title: Custom Resource for Generating Lambdas
excerpt: Blog post about how you can use AWS Custom Resources to generate an AWS Lambda function with a predefined name.
categories:
    - cloud 
    - JavaScript
tags: 
    - AWS
    - cloud
    - CloudFormation
    - Custom Resources
    - Lambda
    - Node.js
--- 


[AWS Lambda](https://aws.amazon.com/lambda/) enables you to quickly setup a backend solution for your mobile application. [AWS CloudFormation](https://aws.amazon.com/cloudformation/) allows you to create templates for your infrastructure that can be versioned controlled. When used together, the CloudFormation API provides [AWS::Lambda::Function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html) for creating Lambdas, however the API does not allow you to specify the name of the Lambda function (they will get a name like "MyStackname-LambdaFunctionName-49IO410DTKWM"). By implementing a [Custom Resource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html) this limitation can be circumvented. Continue to read for an explanation of how, or jump directly to the source code in my [sample project](https://github.com/matsev/aws-cloudformation-lambda-generator) at GitHub.

## Update

AWS recently added the [FunctionName](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html#cfn-lambda-function-functionname) element to the [AWS::Lambda::Function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html) resource which makes this blog post superfluous if you are just looking for a simple way to give your Lambda function a predefined name. However, you may still find it interesting if you would like to learn more about AWS custom resources.

## Motivation

Benefits of specifying Lambda names in a Custom Resource instead of the native CloudFormation format include:

*   The names will be predictable and consistent when the stack is (re-)created.
*   If your Lambda is to be used by mobile app developers that use the AWS Mobile SDKs, it is much easier to communicate a human readable name.
*   If you develop scripts for [versioning and aliasing](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html) the function, it easier to parameterize (or hardcode) the function names.

Some disadvantages are:

*   You may not need it, for example if your Lambda function is only used within the template, then you can just [Ref](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html) it when needed.
*   As you are about to see, generating your own Lambdas increase the complexity of the template.
*   Function names must be unique per _account_ and _region_ (not per stack). This constraint is not specific for the approach described in this blog post, the same rule applies if you use the AWS console or the AWS CLI to create Lambdas.

## Outline

When first looking at the problem, the solution seemed pretty straight forward. Since the AWS JavaScript SDK has a [Lambda API](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html), one could use the [createFunction()](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property) (parameters include `FunctionName`), [updateFunctionConfiguration()](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionConfiguration-property) and [deleteFunction()](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#deleteFunction-property) to manage a Lambda's lifecycle. The idea is to map the different [types of requests](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requesttypes.html) in a [Custom Resource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html) to these function calls and then it would "just work". Apart from listening and reacting to the different request types, a Custom Resource must also report back to CloudFormation when it has finished its operation. The response is specified in the documentation of the different types of requests, but there is a [cfn-response](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-cfnresponsemodule) module that provides an API for this task.

## Custom Resource Declaration

As part of the solution, the following Custom Resource declaration is used:

```json

"AlphaLambdaGenerator": {
    "Type": "Custom::AlphaLambdaGenerator",
    "Properties": {
        "ServiceToken" : {"Fn::GetAtt": ["LambdaGenerator", "Arn"]},
        "Lambda": {
            "FunctionName": "AlphaLambda",
            "Role": { "Fn::GetAtt": ["LambdaExecutionRole", "Arn"]}
        }
    }
}
```
        

The `ServiceToken` property is part of the [AWS::Custom::Resource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cfn-customresource.html) contract. It points to the `LambdaGenerator` that is responsible for managing the generated Lambda(s). The `Lambda` sub-document contains properties specific for the Lambda that will be created and it uses the same syntax as the [AWS::Lambda::Function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html). The `FunctionName` and the `Role` parameters are mandatory. If no `Code` property is specified an "echo" Lambda function will be generated that has `nodejs` as `Runtime` and `index.handler` as `Handler` function. Alternatively, by using the `Code` property and providing the `S3Bucket` and `S3Key` parameters and it is also possible to use a different Lambda `Runtime`.

## Unwanted Deletions

As mentioned earlier, Lambda function names must be unique per account and per region. In the happy flow these facts do not matter, a Lambda will be created when the stack is initiated and it will be deleted when the stack is taken down. However, if you accidentally copy / paste the Custom Resource in your CloudFormation template and forget to change the function name the stack stack update will fail. What is worse, during its rollback it will delete any existing Lambda with the same name that was created by another Custom Resource. Likewise, if the same Cloud Formation template is used to create a second stack in the same account, all Lambda names will be duplicated, the stack creation will fail and during the rollback all Lambdas in the existing stack will be deleted. Neither of these scenarios are acceptable. For this reason, one can pay attention to when and how the `physicalResourceId` parameter is passed when replying to the [cfn-response](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-cfnresponsemodule). By doing so, it is possible to mitigate the consequences of the the mistakes. In the first case, the stack update will still fail, but at least the rollback will not bring down any existing Lambda. In the second case, the new stack creation will also fail, but the working stack will be unaffected.

## Create Lambda

The function that creates the custom Lambda function needs some configuration parameters. For this matter, the `Lambda` object in the Custom Resource declaration is copied to the `event.ResourceProperties.Lambda` property by CloudFormation (the `Lambda` name can be chosen arbitrarily and you can several. Any custom `Properties.*` object in the Custom Resource declaration will be available to your custom Lambda function in the `event.ResourceProperties.*`). There are a few things to consider when creating the Lambda function programmatically using a Custom Resource. First, there is a check if the Custom Resource configuration contains any reference to an existing implementation in a S3 bucket, if not it will call the `createEchoFunction(..)` so that the generated Lambda will get a simple "echo" implementation. Secondly, the [createFunction()](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property) function will be called to actually create the Lambda. Lastly, notify CloudFormation that Custom Resource has completed its execution by calling the `send()` function of the [cfn-response](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-cfnresponsemodule). If the creation succeeded, the `physicalResourceId` parameter is provided so that it can be used later when a delete request occurs. If the creation failed, the parameter is omitted.

```javascript
function createLambda(event, context) {
    var lambdaParams = event.ResourceProperties.Lambda;
    var functionName = lambdaParams.FunctionName;

    console.log('Creating lambda:', JSON.stringify(lambdaParams));

    // Check whether or not there is an Lambda function implementation in an S3 bucket that should be used
    if (!lambdaParams.Code || !lambdaParams.Code.S3Bucket) {
        // No code provided, create initial version.
        lambdaParams.Handler = lambdaParams.Handler || 'index.handler';
        lambdaParams.Code = {ZipFile: createEchoFunction(lambdaParams.Handler)};
        lambdaParams.Description = lambdaParams.Description || 'Initial "echo" lambda';
        lambdaParams.Runtime = 'nodejs';
    }
    lambda.createFunction(lambdaParams, function (err, data) {
        if (err) {
            // Lambda creation failed, do not provide the physicalResourceId
            response.send(event, context, response.FAILED, err);
        }
        else {
            // Lambda creation succeeded, provide functionName as physicalResourceId so that this stack can delete it
            response.send(event, context, response.SUCCESS, data, functionName);
        }
    });
}
```
        

## Delete Lambda

When the Lambda is deleted, the process is reversed. First, check if the delete request has the same `physicalResourceId` as used in the create request by comparing it against the `functionName`. If they match, call the [deleteFunction()](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#deleteFunction-property) and respond back to CloudFormation. If they do not match, it means that some other stack or some other Custom Resource has created the Lambda and for this reason it should not be deleted now. Nevertheless, a delete request has been received from the stack and the function sends a success response back to CloudFormation since this is a valid state.

```javascript
function deleteLambda(event, context) {
    var lambdaParams = event.ResourceProperties.Lambda;
    var functionName = lambdaParams.FunctionName;
    var physicalResourceId = event.PhysicalResourceId;

    // Check if the physicalResourceId has the same value as provided by the createLambda() function
    if (physicalResourceId === functionName) {

        // Yes, this Lambda was indeed created by this stack, ok to delete
        console.log('Deleting Lambda:', functionName);

        lambda.deleteFunction({FunctionName: functionName}, function (err, data) {
            if (err) {
                response.send(event, context, response.FAILED, err, functionName);
            }
            else {
                response.send(event, context, response.SUCCESS, data, functionName);
            }
        });
    }
    else {

        // No, this Lambda was created by someone else, do not delete, but send success response
        console.log('Do not delete Lambda:', functionName ,' (physicalResourceId:', physicalResourceId, ')');
        response.send(event, context, response.SUCCESS);
    }
}
```
        

## Limitation

It is not possible to change the `FunctionName` parameter in the Custom Resource, e.g. simply changing from `AlphaLambda` to `BetaLambda` will not work. A workaround is if you at the same time also rename the logical resource from `AlphaGenerator` in this example to let's say `BetaGenerator`. Consequently, CloudFormation will send a delete request to `AlphaGenerator` which in turn will delete the `AlphaLambda`. At the same time a `BetaGenerator` Custom Resource will be created, which will create the `BetaLambda` accordingly.

## Lessons Learned

*   Make sure that there is a log policy created before the Custom Resource is called. This can be achieved by either inlining the policy in the role that is used by the Lambda, or by adding [DependsOn](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html) attribute to the Lambda declaration. Without the log policy being present when the Custom Resource is executed, its log calls will not show up in CloudWatch, making it very difficult to trace the flow of execution and to find the cause of potential bugs in Lambda implementation.
*   Be cautious of how and when you use the `physicalResourceId` when sending the response from the Custom Resource to CloudFormation. The doucmentation of [cfn-response](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-cfnresponsemodule) suggests that the parameter is optional. In some sense this claim is true since the function call will default to use the name of a log stream name if the parameter is missing. As a side effect, if CloudFormation assigns the same log stream to two resources they will get the same `physicalResourceId`. Later, if one of the Custom Resources is deleted, Cloud Formation will send a delete request to the other one as well because of their shared `physicalResourceId`. Moreover, the `physicalResourceId` can be used to guard against false deletions if there is a risk that a Custom Resource may receive more than one delete request due to human errors like duplicated function names in a CloudFormation template or attempts to deploy the same CloudFormation template twice as explained in the [Delete Lambda](#delete-lambda) paragraph.
*   When using the native [AWS::Lambda::Function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html) declaration it is possible to inline the Lambda's JavaScript implementation as a `String` using the `ZipFile` property as shown in [this example](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-custom-resources-lambda-cross-stack-ref.html#create-ec2-stack). Note, the implementation must not [exceed 2048](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html) characters.
*   It is _not_ possible to inline the JavaScript of a Lambda function as a `String` in the `ZipFile` property when creating a Lambda function using the AWS JavaScript SDK [Lambda.createFunction(...)](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property). To get this working, one can zip the function implementation into a node.js [Buffer](https://nodejs.org/docs/latest-v0.10.x/api/buffer.html) one avoid errors that when CloudFormation attempted to unzip it. Make sure that the module name and export function match the [Handler](http://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-Handler) property.
*   Incorrect usage of [cfn-response](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-cfnresponsemodule) may result in errors during stack creation, update deletion and / or rollback. Similarly, if you experience that the stack hangs indefinitely, you may also benefit from revisiting the parts of the code that deal with `cfn-response`.
*   Lambda versions are immutable. As a consequence, if a Lambda's configuration (such as memory size and timeout) is updated, the changes are applied to the `$LATEST` version of the Lambda. In other words, if you are using [versioning and aliasing](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html) you must make sure to publish a new version and update the alias before any client request will be affected by the change.

## Next Step

The initial Lambda implementation is deliberately just a simple "echo" function. The idea is to hook up a CI server to handle the Lambda updates and let it take care of the production code. When the unit tests pass it will package and upload the new Lambda implementation to the `$LATEST` version. If the integration tests also pass the CI server will publish a new version and update the alias promptly.

## References

There are several references in this blog, the most important ones are:

*   [Lambda API](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html) in the AWS JavaScript SDK
*   [AWS::CloudFormation::CustomResource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cfn-customresource.html) in the AWS CloudFormation User Guide
*   [AWS::Lambda::Function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html) in the AWS CloudFormation User Guide
*   [AWS Lambda Function Code](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html) (including the `cfn-response` module) in the AWS CloudFormation User Guide
*   [Sample project](https://github.com/matsev/aws-cloudformation-lambda-generator) at GitHub

## Acknowledgements

Thanks to [Carl Nordenfelt](https://blog.jayway.com/author/carl-nordenfeltjayway-com/), Jesper Nilsson and [Mattias Lindskog](https://blog.jayway.com/author/mattiaslindskog) for feedback and support.