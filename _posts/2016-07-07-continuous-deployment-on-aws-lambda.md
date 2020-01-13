---
title: Continuous Deployment on AWS Lambda
excerpt: Example of how a you can use a set of bash scripts to implement continuous deployment on AWS Lambda, with reference to a working sample project at GitHub.
categories:
    - CI/CD
    - cloud
    - DevOps
tags:
    - AWS
    - bash
    - CI/CD
    - cloud
    - CloudFormation
    - DevOps
    - Lambda
    - Node.js
    - serverless
---

The quickest way of pushing every code change to production is to use automation, but to do that in a safe and sustainable way also requires test automation. The goal of this blog post is to create a set of bash scripts for automating each part of Continuous Deployment pipeline for a Node.js based AWS Lambda function, including scripts for unit and integration tests. The actual Lambda function is not that important, imagine that there is a business critical Greeting Lambda under development. You will find the implementation together with some unit and integration tests as well as the bash scripts in the [sample project](https://github.com/matsev/lambda-continuous-delivery) at GitHub.

## Lambda Versioning and Alias

A key enabler for implementing continuous deployment on AWS Lambda is its support for [Versioning and Aliases](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html). Follow the link to find more information (as well as a tutorial that inspired this post), but for the purpose of this blog it can summarized as:

*   Every time the code of a Lambda function (or its configuration) is updated it will be available as version `$LATEST`.
*   By publishing a Lambda its code (and configuration) will be assigned a unique version number. Versions are immutable, which means that a new version must be published in order to change any Lambda behavior.
*   It is possible to assign one (or more) alias to a specific Lambda version. Each alias can only point to a single version at the time. In contrast to versions alias can be changed, i.e. they can point to another version if desired.

Note, the client developers that use the Lambda must be notified about the usage of the alias so that they can specify it as a `qualifier` parameter when they use the AWS client SDK. If the Lambda is used by another AWS CloudFormation resource, you need to specify the qualified ARN, i.e. the ARN with the alias name as a suffix to get the correct version. For example, if the `GreetingLambda` has a `PROD` alias, the qualified ARN would look something like `arn:aws:lambda:eu-west-1:123456789012:function:GreetingLambda:PROD`.

## Preparations

Besides an AWS account there are some preparations required before we dive into details of the continuous deployment scripts.

#### Tools

A couple of tools need to be installed to the development environment:

*   [AWS CLI](https://aws.amazon.com/cli/), AWS Command Line Interface (see also the [configuration guideline](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)).
*   [jq](https://stedolan.github.io/jq/), a command line JSON processor.

#### npm Scripts

A few npm scripts have been defined in the [package.json](https://github.com/matsev/lambda-continuous-delivery/blob/master/package.json) file:

```json
"scripts": {
  "test": "mocha --recursive",
  "xunit-test": "XUNIT_FILE=xunit-test.xml mocha --recursive -R xunit-file",
  "itest": "mocha --recursive integration-test",
  "xunit-itest": "XUNIT_FILE=xunit-itest.xml mocha --recursive integration-test -R xunit-file"
}
```        

The first is used to tell [mocha](https://mochajs.org/) to execute all tests in the default `test` folder recursively. The second is similar, but uses the `-R` (or `--reporter`) parameter to define that the result should be published using the [xunit-file](https://www.npmjs.com/package/xunit-file) reporter. The `XUNIT_FILE=xunit-test.xml` is an environment variable used by the `xunit-file` reporter to specify the output to the `xunit-test.xml` file. The third script executes the integration tests located in the `integration-test` folder recursively. Finally, the last one executes the integration tests and publishes the result in the `xunit-itest.xml` file. Typically, you use the first and third scripts on your local developer machine, whereas the second and the fourth are well suited for a build server that can visualize the xunit result files. Side note, if you would like to learn more about npm scripts, I recommend that you read the blog post [Running scripts with npm](https://blog.jayway.com/2014/03/28/running-scripts-with-npm/) by my colleague Anders Janmyr.

#### CloudFormation and Initial Lambda

Before we can upload any Lambda function code, we need to create a CloudFormation template with a Lambda resource. Since the function code will be updated later, we just provide a simple echo function:

```json
"GreetingLambda": {
  "Type" : "AWS::Lambda::Function",
  "Properties": {
    "Code": {
      "ZipFile": { "Fn::Join": ["\n", [
        "'use strict';",
        "",
        "// Initial Echo Lambda",
        "exports.handler = (event, context) => {",
        "  console.log('Event:', JSON.stringify(event));",
        "  context.succeed(event);",
        "};"
      ]]}
    },
    "Description": "A greeting function",
    "FunctionName": "GreetingLambda",
    "Handler": "index.handler",
    "Role": { "Fn::GetAtt": ["LambdaExecutionRole", "Arn"]},
    "Runtime": "nodejs4.3"
  }
}
```
     

## Bash Scripts

Now that we are all geared up, it is time to take a closer look at the bash scripts. Step by step we will see how the code is tested, deployed, integration tested and if successful also deployed to a `STAGE` alias and a `PROD` alias respectively. It should be possible to call each script individually, but as I will show later, we will also create one script that will chain the scripts together to be able to execute all steps in a single command. The idea is that if one script fails, the chain should break to prevent that bad code is being deployed. You will find an outline of the scripts below. I recommend that you open the [scripts folder](https://github.com/matsev/lambda-continuous-delivery/tree/master/scripts) in the example project at GitHub if you would like to see the source code.

#### 0. Create Stack

First, we create an initial helper script since it creates the stack (including the initial echo Lambda) from the CloudFormation template. It is not a part of the continuous delivery pipeline, but it is a good idea to have stack management automated and version controlled.

```bash
aws cloudformation create-stack \
  --stack-name greeting-stack \
  --template-body fileb://cloudformation.template \
  --capabilities CAPABILITY_IAM \
  --region eu-west-1
```      

Ref: [0-create-stack.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/0-create-stack.sh).

#### 1. Unit Tests

The continuous delivery pipeline kicks off with a script that executes the npm unit test script that prints the result in xunit format:

```bash
npm install
npm run xunit-test
```      

Ref: [1-test.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/1-test.sh).

#### 2. Package

Create a distribution package by zipping relevant files:

```bash
rm -rf target
mkdir -p target

cp -r *.js package.json lib target/

pushd target
npm install --production
zip -r greeting-lambda.zip .
popd
```
        

Ref: [2-package.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/2-package.sh).

#### 3. Update Lambda

Upload the zip file to AWS Lambda as version `$LATEST`. It does not affect neither the `STAGE` alias nor the `PROD` alias:

```bash
aws lambda update-function-code \
  --function-name GreetingLambda \
  --zip-file fileb://greeting-lambda.zip \
  --region eu-west-1
```
        

Ref: [3-update-lambda.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/3-update-lambda.sh).

#### 4. Integration Tests

Execute integration tests against version `$LATEST` by calling the npm integration test script that prints the result in xunit format. If the integration tests fails, the build pipeline will break with the failing code still deployed to version `$LATEST`. It is not a problem since it is not used by the clients and it will be replaced next time the pipeline starts over and updates the Lambda:

```bash
npm install
npm run xunit-itest
```        

Ref: [4-integration-test.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/4-integration-test.sh).

#### 5. Publish $LATEST Version

Since both the unit tests and integration tests have passed, we can confidently publish version `$LATEST` as a new Lambda version. Here, I choose to use the optional version `--description` parameter and pass a `$build_number` parameter for its value. The idea is that the build number is generated by the build server that execute the script. It may be an actual number that is incremented for each build, but it could also be a date string or a Git SHA. Different teams have different preferences, the only limitation is that it should be unique. Yet again, neither the `STAGE` alias nor the `PROD` are changed:

```bash
aws lambda publish-version \
  --function-name GreetingLambda \
  --description $build_number \
  --region eu-west-1
```

Ref: [5-publish-version.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/5-publish-version.sh).

#### 6. Update STAGE Alias

When the new version is published, the `STAGE` alias can be updated. For this reason we first lookup the Lambda version that is associated with the `$build_number`:

```bash
# Find the Lambda version that is not the $LATEST version and has the ${build_number} as its description
lambda_version=$(aws lambda list-versions-by-function \
  --function-name GreetingLambda \
  --region eu-west-1 \
  --output json| jq -r ".Versions[] | select(.Version!=\"\$LATEST\") | select(.Description == \"${build_number}\").Version")
```
        

It should be noted that we could have obtained the Lambda version directly from the output of the `aws lambda publish-version` command. The reason why I choose to look it up is that I would like a script that can update the alias based on the `$build_number` rather than the AWS Lambda version. Thus, we can use the same script to update any alias to any successful build without knowing its AWS version (including the `PROD` alias as you will see soon). Next, we get a list of all aliases for the Lambda function:

```bash
existing_aliases=$(aws lambda list-aliases \
  --function-name GreetingLambda \
  --region $aws_region \
  --output json| jq -r '.Aliases[] | {Name: .Name}')
```

If the alias we would like to update already exists, we can update it:

```bash
aws lambda update-alias \
  --function-name GreetingLambda \
  --name STAGE \
  --function-version $lambda_version \
  --description $build_number \
  --region eu-west-1
```

Otherwise, we need to create it:

```bash
aws lambda create-alias \
  --function-name GreetingLambda \
  --name STAGE \
  --function-version $lambda_version \
  --description $build_number \
  --region eu-west-1
```

Ref: [6-update-stage-alias.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/6-update-stage-alias.sh) and [update-alias.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/update-alias.sh).

#### 7. Update PROD Alias

Basically the same script as the one that updated the `STAGE` alias, but this time with `PROD` as alias parameter value. Ref: [7-update-prod-alias.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/7-update-prod-alias.sh) and [update-alias.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/update-alias.sh).

#### Build and Deploy to STAGE

Now it is a simple task to create a single script which in turn calls all of the other scripts. In this example, I have chosen to do this in yet another bash script, but if you use Jenkins 2.0 or later you might as well call them from a [Jenkinsfile](https://jenkins.io/doc/pipeline/) pipeline script directly. I suggest that your build server is setup to use this script in a continuous delivery pipeline to deploy every successful build directly to `STAGE`. The last step, [7-update-prod-alias.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/7-update-prod-alias.sh), would be configured as a manual trigger based on a decision from the development team, project stakeholders or similar. Ref: [build-and-deploy-to-stage.sh](https://github.com/matsev/lambda-continuous-delivery/blob/master/scripts/build-and-deploy-to-stage.sh).

## Considerations

#### FunctionName

In the CloudFormation template, I have configured the Lambda function with the [FunctionName](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html#cfn-lambda-function-functionname) property. The same name is used by the scripts and it is also very useful for clients that communicate directly with the Lambda function using one of the AWS SDKs since it gives the function a predictable name. The trade-off is that it is not possible to do updates that require the resource to be replaced, see [AWS::Lambda::Function](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html#cfn-lambda-function-functionname) documentation for details. If you do not use `FunctionName`, you can still use the provided scripts, but you need to update the Lambda name parameter with the name that AWS gives your function. You can also make this dynamic by enhancing the scripts to lookup the Lambda name dynamically by providing the Lambda resource name as a [stack output](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html) and then use [aws cloudformation describe stacks](http://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stacks.html) command.

#### Additional Backup

AWS Lambda keeps a reference to each version of the Lambda source code (and configuration) that was published. However, if you delete a Lambda function or the entire stack all versions will be lost. If your past deliveries are important, you may choose to consider keeping another backup of them, e.g. in an S3 bucket. However, since the entire build and deploy chain has been automated, you might as well checkout the source code of an earlier version that you would like to deploy from your version control system and execute the scripts again.

#### Different Configurations

It is not always desirable to use the same backend configuration for the `STAGE` and `PROD` alias. Perhaps the Lambda should write to different SNS topics, read from different S3 buckets or query different DynamoDB tables depending on which alias is used? By looking at the `context.invokedFunctionArn` parameter passed to the Lambda's handler method, you will see the full ARN of the Lambda, including the alias, e.g. `arn:aws:lambda:eu-west-1:123456789012:function:GreetingLambda:STAGE`. Consequently, you can use methods like [endsWith()](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) or [split()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split) to extract it. Hint, remind the developers of the Lambda client code that the should use the alias if it is missing.

## References

*   [AWS Lambda Versioning and Aliases](http://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html)
*   [Lambda AWS CLI](http://docs.aws.amazon.com/cli/latest/reference/lambda/)
*   [jq Manual](https://stedolan.github.io/jq/manual/)