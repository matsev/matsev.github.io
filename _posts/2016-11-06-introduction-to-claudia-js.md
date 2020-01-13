---
title: Introduction to Claudia.js
excerpt: Introduction to the Claudia.js deployment tool for AWS Lambda and AWS API Gateway. Some basic installation guides and a simple code example is provided.
categories: 
    - cloud 
    - JavaScript
tags: 
    - API Gateway
    - AWS
    - cloud
    - Cloudia.js
    - JavaScript
    - Lambda
    - Node.js
    - serverless
---


Serverless architecture and serverless applications are rapidly gaining momentum. In a couple of previous blog posts I have showed simple examples of how RESTful APIs can be deployed using AWS API Gateway and AWS Lambda. In [one blog post]({% post_url 2016-08-17-introduction-to-cloudformation-for-api-gateway %}) CloudFormation's native resources were used to create the entire stack, including the RESTful API. In [another blog post]({% post_url 2016-09-18-introduction-to-swagger-for-cloudformation-and-api-gateway %}) a different approach was used where some resources remained in Lambda, but Swagger was used to define the RESTful API and the API Gateway mappings. Both alternatives provided full control of your stack, but the configurations were quite verbose even for simple sample projects. This time, we will re-implement the same application yet again, but instead of using CloudFormation we will take a look at what [Claudia.js](https://claudiajs.com/) has to offer. The full source code is available in my GitHub [sample project](https://github.com/matsev/claudiajs-demo).

## tl;dr

Claudia makes it easy to develop serverless applications that can be deployed to AWS. Execute the following steps in order to create a RESTful service that uses AWS API Gateway for HTTP request mapping and AWS Lambda for business logic:

1.  Install Claudia as a global dependency by executing `$ npm install claudia --global`.
2.  Execute `$ npm init` in an empty directory to create a new npm project (enter appropriate answers for your project when prompted).
3.  Add Claudia API Builder as project dependency by executing `$ npm install claudia-api-builder --save`.
4.  Create a new file called `index.js` in the project root folder with the following content:

    ```javascript
    'use strict';
    
    const ApiBuilder = require('claudia-api-builder');
    const api = new ApiBuilder();
    
    module.exports = api;
    
    api.get('/greeting', (request) => {
        console.log('Event:', JSON.stringify(request));
        const name = request.queryString.name || 'World';
        return {greeting: `Hello, ${name}!`};
    });
    ```
        
    
5.  Deploy your application to AWS `$ claudia create --region eu-west-1 --api-module index` (this step requires that you have an AWS account and that you have configured your access key ID and secret access key).
6.  That's it! That is all that is required to create an API Gateway backed by Lambda. To verify that it is working copy the url from the output of the previous command, append `/greeting` to it and make a request:
    
    ```bash
    $ curl https://[api-gateway-id].execute-api.eu-west-1.amazonaws.com/latest/greeting
    {"greeting":"Hello, World!"}
    ``` 
    
7.  Deployed and verified, wait for customers to start using your incredible greeting service. :-)

## Claudia.js

At its core, Claudia.js is a deployment tool. The following lines have been copied from the [project homepage](https://claudiajs.com/):

> Claudia makes it easy to deploy Node.js projects to AWS Lambda and API Gateway. It automates all the error-prone deployment and configuration tasks, and sets everything up the way JavaScript developers expect out of the box.

In addition, there is the [Claudia API Builder](https://claudiajs.com/claudia-api-builder.html) that takes of the API Gateway generation, request and response mapping, etc:

> Claudia API Builder is an extension library for Claudia.js that helps you get started with AWS API Gateway easily, and significantly reduces the learning curve required to launch web APIs in AWS. Instead of having to learn Swagger, manually managing request and response transformation templates, manually linking gateway methods to Lambda functions, you can just write the code for your API handlers, and Claudia API Builder takes care of the rest

Behind the scenes, the [AWS JavaScript SDK](https://aws.amazon.com/sdk-for-node-js/) is used to handle the deployment. By executing just a few commands, Claudia will create an application stack that comprises not only the API Gateway and the Lambda function in addition to the [Lambda Proxy Integration](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html) which glues the two together. Moreover, the required IAM role and the permission required for the API Gateway to invoke the Lambda are also created as part of the process.

## CLI Tool

In order to work with Claudia, the CLI tool need to be installed. It can be installed as a global npm module, e.g. `$ npm install claudia --global` or you can install it as a test dependency `$ npm install claudia --save-dev` and then add the local `node_modules/.bin` directory to your `$PATH`. Verify by executing `claudia --version`. For a full list of the available command line args see the [Command Args](https://claudiajs.com/documentation.html) documentation or execute `$ claudia --help`. As an alternative (or rather as a complement) to the CLI tool, one can also write some [deployment scripts](https://claudiajs.com/tutorials/package-json-scripts.html) by adding a few lines to the `script` part of the [package.json](https://github.com/matsev/claudiajs-demo/blob/master/package.json#L8-L9) file:

```json
"scripts": {
    "create-app": "claudia create --region eu-west-1 --api-module index",
    "update": "claudia update"
}
``` 

The `create-app` script calls [claudia create](https://github.com/claudiajs/claudia/blob/master/docs/create.md) command (see link for details) and similarly the `update` script calls the [claudia update](https://github.com/claudiajs/claudia/blob/master/docs/update.md) command. To learn more about npm scripts, please read the blog [Running scripts with npm](https://blog.jayway.com/2014/03/28/running-scripts-with-npm/) authored by my colleague Anders Janmyr.

## Lambda Function

Before looking at the Lambda implementation, we create a new npm project by executing `$ npm init` and provide some good answers. Add the `claudia-api-builder` to the project, e.g. `$ npm install claudia-api-builder --save`. Now, we can copy / paste the following lines to an [index.js](https://github.com/matsev/claudiajs-demo/blob/master/index.js) file in the project root:

```javascript
'use strict';
    
const ApiBuilder = require('claudia-api-builder');
const api = new ApiBuilder();

module.exports = api;

api.get('/greeting', (request) => {
    console.log('Event:', JSON.stringify(request));
    const name = request.queryString.name || 'World';
    return {greeting: `Hello, ${name}!`};
});
```
    

The API builder is used to define a `/greeting` resource that expects a `GET` request. If the string contains a query string parameter called `name` it is used as part of the response, otherwise `Hello, World!` is returned as the greeting response. The [request](https://github.com/claudiajs/claudia-api-builder/blob/master/docs/api.md#the-request-object) object contains all information that was passed from the client, e.g. HTTP headers, request body, the [Lambda context object](http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html), the [API Gateway context](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html#context-variable-reference), etc. The return value can either be a simple JavaScript object as exemplified above, but it can also be a `Promise` or more complex data structures, dynamic response, custom response headers and so on, see the [documentation](https://github.com/claudiajs/claudia-api-builder/blob/master/docs/api.md#responding-to-requests) for details. In contrast to the native CloudFormation API Gateway implementation (and the CloudFormation Swagger configuration for that matter) the Claudia API Builder maps all API Gateway resources automatically to a single Lambda function. If you would like to have a richer REST api, you simply register more [http handlers](https://github.com/claudiajs/claudia-api-builder/blob/master/docs/api.md#api-definition-syntax) with their paths by calling `get`, `put`, `post` or `delete`, very similar to how you would when you are developing a Node app that uses the Express web framework. In fact, with very little effort you can port an existing Express app to Claudia by just changing a couple of lines in the source code and importing the `aws-serverless-express` module, see [Running Express Apps in AWS Lambda](https://claudiajs.com/tutorials/serverless-express.html) for details.

## Deployment

Now we are ready to deploy. We do so by either calling the [claudia create](https://github.com/claudiajs/claudia/blob/master/docs/create.md) command. As a result, we will see the details of the resource that were created:

```bash
$ claudia create --region eu-west-1 --api-module index
[...]
saving configuration
{
    "lambda": {
    "role": "claudiajs-demo-executor",
    "name": "claudiajs-demo",
    "region": "eu-west-1"
    },
    "api": {
    "id": "[api-gateway-id]",
    "module": "index",
    "url": "https://[api-gateway-id].execute-api.eu-west-1.amazonaws.com/latest"
    }
}
```   

where `[api-gateway-id]` is the id of your API Gateway. Alternatively we can use the npm script mentioned earlier with a similar result:

```bash
$ npm run create-app
[...]
saving configuration
[...]
```

After the deployment, we can verify that the API Gateway and Lambda function has been deployed successfully:

```bash
$ curl https://[api-gateway-id].execute-api.eu-west-1.amazonaws.com/latest/greeting
{"greeting":"Hello, World!"}
[...]
$ curl https://[api-gateway-id].execute-api.eu-west-1.amazonaws.com/latest/greeting?name=Superman
{"greeting":"Hello, Superman!"}
```

## Considerations

*   There are other tools that can help with API Gateway and Lambda configuration and deployment such as [Serverless](https://github.com/serverless/serverless) and [Seneca](http://senecajs.org/) that you may find interesting. Start by reading the [comparison](https://github.com/claudiajs/claudia/blob/master/FAQ.md#how-does-it-compare-to-) guide in the Claudia FAQ for a brief overview. There is also the [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) library from AWS Labs.
*   A `claudia.json` file will be created after the initial call to [claudia create](https://github.com/claudiajs/claudia/blob/master/docs/create.md). This file contains your project specific Claudia configuration and should typically be added to version control so that your team mates and build server work against the same environment.
*   If you need to start over (or shut down the application), there is the [claudia destroy](https://github.com/claudiajs/claudia/blob/master/docs/destroy.md) command.
*   As mentioned Claudia is a deployment tool that uses the AWS JavaScript SDK. It does not use CloudFormation and thus you cannot use CloudFormation to track your resources.
*   Another consequence of not using CloudFormation is that you need to think twice about how you configure the Lambda functions when calling external services such as DynamoDB. The Claudia documentation provides a [checklist](https://claudiajs.com/tutorials/external-services.html) for integration tips, including guidelines for [setting up IAM privileges](https://claudiajs.com/tutorials/external-services.html#set-up-iam-access-privileges) and using [stage variables](https://claudiajs.com/tutorials/external-services.html#configure-external-access-keys-with-stage-variables) for differentiation between environments. You can use a similar approach to detect the [environment configuration without API Gateway](https://claudiajs.com/tutorials/versions.html#environment-configuration-without-api-gateway).
*   If you do not fancy the `claudia-api-builder`, you can still create a [proxy Lambda function](https://claudiajs.com/tutorials/deploying-proxy-api.html) using Claudia. This can be useful if your clients use the Lambda API of an AWS SDK instead of a REST client when communicating with your backend.

## More Resources

More information and links are available at the [Claudia.js](https://claudiajs.com/) website, for example:

*   [Claudia Documentation](https://claudiajs.com/documentation.html).
*   [Hello World Lambda Tutorial](https://claudiajs.com/tutorials/hello-world-lambda.html).
*   [Hello World API Gateway Tutorial](https://claudiajs.com/tutorials/hello-world-api-gateway.html).
*   [Claudia Example Projects at GitHub](https://github.com/claudiajs/example-projects).
*   [The Claudia Gitter channel](https://gitter.im/claudiajs/claudia).