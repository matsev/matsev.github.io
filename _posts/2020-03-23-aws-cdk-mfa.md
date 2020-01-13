---
title: AWS CDK MFA
categories: 
    - cloud 
    - JavaScript
    - security
tags: 
    - AWS
    - AWS CDK
    - cloud
    - JavaScript
    - MFA
    - security
---

The [AWS CDK (Cloud Development Kit)](https://aws.amazon.com/cdk/) is a welcome contribution to the "Infrastructure as Code" family. It is a development framework that allows you to configure AWS resources using programming languages like TypeScript, JavaScript, Java, Python and C#. In this post, I will present how you can improve the security of your AWS account by enabling MFA (Multi Factor Authentication) when you are working with the AWS CDK.


## Background

I recently had the opportunity to try the AWS CDK in a real project. The [getting started guide](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) provided a good introduction and soon it was time for the first deployment. The intended deployment account was configured to use MFA for the AWS CLI (see my previous blog [AWS CLI MFA]({% post_url 2017-11-22-aws-cli-mfa %})) which made deployment more complicated. That said, the paragraph about Specifying Your Credentials and Region using AWS CLI profiles seemed to provide a solution. I thought I could just pass my AWS CLI configured MFA profile and it would “just work” (spoiler: it didn’t):

```bash 
$ npx cdk deploy --profile my-project-mfa
Need to perform AWS calls for account 123456789012, but no credentials found. Tried: default credentials.
```

 Regrettably, it turns out that the AWS CDK does not currently support MFA natively. There are a couple of open issues in the AWS CDK GitHub repository that addresses this concern ([#1248](https://github.com/aws/aws-cdk/issues/1248) and [#1656](https://github.com/aws/aws-cdk/issues/1656)). However they are more than a year old, so rather than waiting for them to be resolved, I thought I'd better look for other solutions. Preferably a solution that could leverage my MFA configuration referenced earlier. In the end, I found the [cdk-multi-profile-plugin](https://www.npmjs.com/package/cdk-multi-profile-plugin) npm package and I am quite happy with the result, especially since I was already using npm as a package manager for my CDK project. 


## Prerequisites

- Please spend some time to read up on how MFA can be configured for AWS CLI access if you are not familiar with the topic. For example, read my [AWS CLI MFA]({% post_url 2017-11-22-aws-cli-mfa %}) blog or the AWS CLI user guide about [Using Multi-Factor Authentication](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html#cli-configure-role-mfa).

- Install the [cdk-multi-profile-plugin](https://www.npmjs.com/package/cdk-multi-profile-plugin):

    ```bash
    $ npm install cdk-multi-profile-plugin --save-dev
    ```


## Configuration

There are a few different ways to configure the <code>cdk-multi-profile-plugin</code> depending on how it is used. In my team, every developer is responsible for managing his or her own development environment. As a consequence, the developers also create and manage AWS CLI profiles independently of the other team members. There are a few things required in order for this to work:


### cdk.json

Add the plugin to the [cdk.json](https://github.com/aws/aws-cdk/blob/master/packages/aws-cdk/README.md#configuration) file, i.e. the CDK configuration file in the project root (this file was generated when by the `cdk init` command, see the [Getting Started Guide](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)):

```json
{
  "app": "npx ts-node bin/YOURAPP.ts",
  "plugin": ["cdk-multi-profile-plugin"]
}
```

Make sure to replace the `bin/YOURAPP.ts` with the correct value for your CDK project before adding this file to version control.


### ~/.aws/config

Next, imagine that you have the following AWS CLI profiles in your `~/.aws/config` file (see [previous blog post]({% post_url 2017-11-22-aws-cli-mfa %}#aws-cli-profiles) for details):

```bash
[profile my-project-mfa]
source_profile = my-project
role_arn = arn:aws:iam::123456789012:role/AdminMFARole
mfa_serial = arn:aws:iam::123456789012:mfa/my-user-name
```
    
Explanation:

- `source_profile` name of the profile configured in the `~/.aws/config` file, i.e. the profile that has the `aws_access_key_id` and `aws_secret_access_key`
- `role_arn` ARN of role to be assumed when accessing resources in the account (either using the AWS CLI or in this case using the CDK)
- `mfa_serial` ARN of your configured MFA device

The values are specific both for each developer and for each project, make sure to update them accordingly.   
    

### cdkmultiprofileplugin.json

Lastly, we must associate each AWS account in the [CDK Environment](https://docs.aws.amazon.com/cdk/latest/guide/environments.html) with a corresponding AWS CLI profile that we can use to access that environment. For this reason, each developer creates his or her own `cdkmultiprofileplugin.json` configuration file and adds it to the project root, e.g.

```json
{
  "awsProfiles": {
    "123456789012": "my-project-mfa"
  }
}
```

The number `123456789012` maps to the AWS Account ID used in the CDK Environment configuration. The value `my-project-mfa` is the name of the AWS CLI profile for the same account as outlined in the [~/.aws/config](#awsconfig) paragraph. You can add more account / CLI profile pairs if the CDK Environment has multiple deployment accounts.  

Do not add this file to version control unless you have agreed to use common CLI profile names. If this is the case, keep in mind that there are other configuration options as well. The plugin [README](https://github.com/hupe1980/cdk-multi-profile-plugin/blob/master/cdk-multi-profile-plugin/README.md) presents all options so that you can choose a suitable solution for your project.


## Usage

Now that we have all pieces in place, we can build and deploy the stack!

```bash
$ npm run build && npx cdk deploy

🚀  Using profile my-project-mfa for account 123456789012 in mode ForReading
  
? MFA token for arn:aws:iam::123456789012:mfa/my-user-name: [enters MFA token]

This deployment will make potentially sensitive changes according to your current security approval level (--require-approval broadening).
Please confirm you intend to make the following modifications:

[Presents stack changes]

Do you wish to deploy these changes (y/n)?  y

TestStack: deploying...

 🚀  Using profile my-project-mfa for account 123456789012 in mode ForWriting

TestStack: creating CloudFormation changeset...

[CloudFormation stack events]

✅  TestStack
```


## Dependencies

- [aws-cdk: 1.28.0](https://www.npmjs.com/package/aws-cdk/v/1.28.0)
- [cdk-multi-profile-plugin: 1.1.2](https://www.npmjs.com/package/cdk-multi-profile-plugin/v/1.1.2)