---
title: AWS Elasticsearch JavaScript Client
excerpt: Blog post that shows how an AWS Elasticsearch JavaScript Client can be implemented in addition to an example of an AWS Elasticsearch IAM policy implementation.
categories: 
    - cloud 
    - JavaScript
tags: 
    - AWS
    - cloud
    - Elasticsearch
    - JavaScript
    - Lambda
---


I have spent some time working with the [AWS Elasticsearch Service](https://aws.amazon.com/elasticsearch-service/) lately. Regrettably, I found the threshold before being productive was higher than I anticipated. One of my obstacles was to get an AWS Elasticsearch JavaScript client working inside an AWS Lambda function, so I thought I'd better make a note of my solution in case I run into a similar problem in the future.

## Elasticsearch IAM Policy Document

Before looking at the client implementation, we need to make sure that it is allowed to access the Elasticsearch domain. As always, this requires that the client is associated with an IAM Policy Document. Adhering to the AWS guideline of [principle of least privileges](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) the policy is as strict as possible.

```json
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": "es:ESHttp*", 
        "Resource": "arn:aws:es:eu-west-1:111122223333:my-domain/*"
    }]
}
```
    

The `*` character at the end of the `es:ESHttp*` value implies that all HTTP methods are allowed. You may choose to lock down the policy even further. One example is to use `"es:ESHttpGet"` for just permitting reading data from Elasticsearch. Another example is `["es:ESHttpPost", "es:ESHttpPut"]` for clients that only add data to the domain. Finally, the `Resource` property tells us that the policy statement only affects the Elasticsearch domain with the specified ARN.

## Elasticsearch Client

My first naive attempt was to use a HTTP client to make requests to the [Elasticsearch HTTP API](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/docs.html) of my domain. It failed misearably, AWS requires that HTTP requests are signed with [Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html) to be valid. The AWS SDK handles this internally so usually you do not need to bother. Realizing that, I took a closer look at what functionality the [ES](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ES.html) class in the AWS JavaScript SDK offers. It does indeed provide an Elasticsearch API, but it is all about domain configuration, management and it does not provide any client features. Next, when I studied the [AWS Elasticsearch developer guide](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/what-is-amazon-elasticsearch-service.html), I found an [JavaScript client snippet](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-indexing-programmatic.html#es-indexing-programmatic-node). It had some limitations in my opinion (it uses global variables for request configuration and response handling just logs HTTP status code and response body). For this reason, I chose to rewrite it to a more generic `elasticsearch-client.js` file:

```javascript
'use strict';
    
const path = require('path');
const AWS = require('aws-sdk');

const { AWS_REGION, ELASTICSEARCH_DOMAIN } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);
const httpClient = new AWS.HttpClient();
const credentials = new AWS.EnvironmentCredentials('AWS');

/**
 * Sends a request to Elasticsearch
 *
 * @param {string} httpMethod - The HTTP method, e.g. 'GET', 'PUT', 'DELETE', etc
 * @param {string} requestPath - The HTTP path (relative to the Elasticsearch domain), e.g. '.kibana'
 * @param {Object} [payload] - An optional JavaScript object that will be serialized to the HTTP request body
 * @returns {Promise} Promise - object with the result of the HTTP response
 */
function sendRequest({ httpMethod, requestPath, payload }) {
    const request = new AWS.HttpRequest(endpoint, AWS_REGION);

    request.method = httpMethod;
    request.path = path.join(request.path, requestPath);
    request.body = JSON.stringify(payload);
    request.headers['Content-Type'] = 'application/json';
    request.headers['Host'] = ELASTICSEARCH_DOMAIN;

    const signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(credentials, new Date());

    return new Promise((resolve, reject) => {
        httpClient.handleRequest(request, null,
            response => {
                const { statusCode, statusMessage, headers } = response;
                let body = '';
                response.on('data', chunk => {
                    body += chunk;
                });
                response.on('end', () => {
                    const data = {
                        statusCode,
                        statusMessage,
                        headers
                    };
                    if (body) {
                        data.body = JSON.parse(body);
                    }
                    resolve(data);
                });
            },
            err => {
                reject(err);
            });
    });
}

module.exports = sendRequest;
```    

## Example Usage

The above implementation enables you to implement all methods in the [Elasticsearch HTTP API](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/docs.html). The only missing part is an environment variable called `ELASTICSEARCH_DOMAIN` that should have the value of your AWS hosted Elasticsearch domain such as `my-domain-qwertyasdf.eu-west-1.es.amazonaws.com`. To create a new Elasticsearch index called `my-index` you execute the function call by providing the required parameters in the corresponding [Create Index API](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-create-index.html):

```javascript
'use strict';
    
const sendElasticsearchRequest = require('./elasticsearch-client');

const params = {
    httpMethod: 'PUT',
    requestPath: 'my-index',
    payload: {
        // see link above for details
        settings: {
            index: {
                number_of_shards: 3,
                number_of_replicas: 2
            }
        }
    }
};
sendElasticsearchRequest(params)
    .then(response => {
        console.info(response);
    });
```

And the result may look something like:

```javascript
{ 
    statusCode: 200,
    statusMessage: 'OK',
    headers: { 
        date: 'Wed, 05 Sep 2018 20:24:24 GMT',
        'content-type': 'application/json; charset=UTF-8',
        'content-length': '67',
        connection: 'keep-alive',
        'access-control-allow-origin': '*' 
    },
    body: { 
        acknowledged: true,
        shards_acknowledged: true,
        index: 'my-index'
    } 
}
```

## Considerations

*   The Elasticsearch client above returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). Timeouts and unknown domain URLs result in [Promise.reject()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject) whereas successful HTTP request/response results in [Promise.resolve()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve). The resolved JavaScript object has three or four properties, namely the HTTP `statusCode`, the HTTP `statusMessage`, the HTTP `headers` and `body` in case there is a HTTP response body. Consequently, the promise will be resolved successfully by any 4XX client error codes (e.g. 404 - Not Found) and 5XX server errors (e.g. 503 Service Unavailable). Feel free to modify the code to reject the promise on HTTP errors if you prefer such behaviour.
*   The client uses the [AWS.EnvironmentCredentials](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EnvironmentCredentials.html) class for obtaining valid credentials since it is being deployed as part of a Lambda function. This is not the only Node.js runtime environment and for this reason this is not the only credential class in the SDK. Please study the [Setting Credentials in Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) chapter in the AWS JavaScript developer guide for other alternatives.
*   A different approach to connect to an AWS Elasticsearch domain is to use the official [Elasticsearch JavaScript client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference-6-2.html). Like my HTTP client attempt, it cannot be used directly since it does not have the AWS Signature Version 4 capability. However, it has a pluggable architecture and there is a community [extension](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/15.x/extensions.html) called `http-aws-es` that solves this problem. I have not tried this method, but they are both available as npm dependencies. Please check [elasticsearch](https://www.npmjs.com/package/elasticsearch") and [http-aws-es](https://www.npmjs.com/package/http-aws-es) for more information.