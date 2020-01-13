---
title: Route53 Configuration for Elastic Beanstalk
excerpt: Blog post about HostedZoneId configuration for a Route53 AliasTarget targeting an Elastic Beanstalk environment in CloudFormation.
categories: 
    - cloud
tags: 
    - AWS
    - Beanstalk
    - cloud
    - CloudFormation
    - Route53
---


The AWS documentation is extensive, yet I find it both incomprehensible and overwhelming from time to time. Recently, I struggled to configure a HostedZoneId in a Route53 AliasTarget targeting an Elastic Beanstalk environment using CloudFormation.

## Challenge

I had an ElasticBeanstalk environment with an ELB (such as the [Elastic Beanstalk Node.js sample application](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/sample-templates-services-eu-west-1.html#d0e136547) available at the AWS site). Now, the task was to configure DNS based on a Route53 Alias Resource Record Set (see [Choosing Between Alias and Non-Alias Resource Record Sets](http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html) for an explanation).

## Configuration

I started by adding a parameter for the domain name:

```json
"Parameters" : {
        
  "DomainName" : {
    "Description" : "The domain name of the app",
    "Type" : "String",
    "Default" : "example.com",
    "ConstraintDescription" : "Must be valid domain name"
  },

  [...]
}
```        

Next, I added two resources for the HostedZone and the RecordSet:

```json
"Resources" : {
        
  "SampleHostedZone": {
    "Type" : "AWS::Route53::HostedZone",
    "Properties" : {
      "Name" : { "Ref" : "DomainName" }
    }
  },

  "SampleRecordSet" : {
    "Type" : "AWS::Route53::RecordSet",
    "Properties" : {
      "AliasTarget" : {
        "DNSName" : { "Fn::GetAtt" : ["SampleEnvironment", "EndpointURL"] },
        "HostedZoneId" : ???
      },
      "HostedZoneId" : { "Ref": "SampleHostedZone" },
      "Name" : { "Ref" : "DomainName" },
      "Type" : "A"
    }
  },

  [...]
}
```
        

## HostedZoneId for AliasTarget?

The most difficult obstacle was to find the correct value for the `HostedZoneId` for the `AliasTarget` configuration (marked as `???` above) . Normally, when configuring an ELB using the `AWS::ElasticLoadBalancing::LoadBalancer` resource, one can use `{ "Fn::GetAtt" : ["myELB", "CanonicalHostedZoneNameID"] }` to get the id of the hosted zone. Unfortunately, this option is not available for Beanstalk environments so that does not work. Next, I found a table in the AWS documentation that [maps AWS regions to Amazon Route 53 Hosted Zone ID](http://docs.aws.amazon.com/general/latest/gr/rande.html#elasticbeanstalk_region). According to the table, the HostedZoneId for `eu-west-1` where my stack resides should be `Z2NYPWQ7DFZAZH`. However, the stack update failed miserably:

> 20:31:03 UTC+0200 CREATE_FAILED AWS::Route53::RecordSet SampleRecordSet Tried to create an alias that targets awseb-e-n-AWSEBLoa-[ABCDEFGHIJKLK-1234567890].eu-west-1.elb.amazonaws.com., type A in zone Z2NYPWQ7DFZAZH, but the alias target name does not lie within the target zone

What to do? By deploying just the Beanstalk configuration (before adding Route53) it is possible to lookup the Hosted Zone Id, either by looking at the "Load Balancers" in the EC2 service in the AWS console, or by calling the CLI:

```bash
$ aws elb describe-load-balancers --region eu-west-1
{
    "LoadBalancerDescriptions": [
        {
            [...]		
            "CanonicalHostedZoneNameID": "Z3NF1Z3NOM5OY2",
            "CanonicalHostedZoneName": "awseb-e-n-AWSEBLoa-[ABCDEFGHIJKLK-1234567890].eu-west-1.elb.amazonaws.com",
            [...]
        }
    ]
}
        

I updated the HostedZoneId in the CloudFormation template to `Z3NF1Z3NOM5OY2` and it worked.

## Solution

Now that I knew what to look for, it was easier to find relevant hits. Some Googling revealed [this issue](https://github.com/fog/fog/issues/1098) that contains a list of AWS regions mapped to Beanstalks HostedZoneIds. The author claims that the mapping can be used for all accounts. Consequently, I added the following mapping to the template:

```json
"Mappings" : {

  "Beanstalk2Route53HostedZoneId" : {
    "us-east-1"      : { "HostedZoneId": "Z3DZXE0Q79N41H" },
    "us-west-1"      : { "HostedZoneId": "Z1M58G0W56PQJA" },
    "us-west-2"      : { "HostedZoneId": "Z33MTJ483KN6FU" },
    "eu-west-1"      : { "HostedZoneId": "Z3NF1Z3NOM5OY2" },
    "ap-northeast-1" : { "HostedZoneId": "Z2YN17T5R711GT" },
    "ap-southeast-1" : { "HostedZoneId": "Z1WI8VXHPB1R38" },
    "sa-east-1"      : { "HostedZoneId": "Z2ES78Y61JGQKS" }
  },

  [...]
}
```
        

And updated the configuration of the `AWS::Route53::RecordSet` accordingly:

```json
"Resources" : {
        
  "SampleRecordSet" : {
    "Type" : "AWS::Route53::RecordSet",
    "Properties" : {
      "AliasTarget" : {
        "DNSName" : { "Fn::GetAtt" : ["SampleEnvironment", "EndpointURL"] },
        "HostedZoneId" : { "Fn::FindInMap" : [ "Beanstalk2Route53HostedZoneId", {"Ref" : "AWS::Region"}, "HostedZoneId" ]}
      },
      "HostedZoneId" : { "Ref": "SampleHostedZone" },
      "Name" : { "Ref" : "DomainName" },
      "Type" : "A"
    }
  },

  [...]
}
```
        

## What's Next?

By now, Route53 should be successfully configured, however that does not mean that DNS is working. Depending on where you have registered your domain, you need to [Configuring Amazon Route 53 as Your DNS Service](http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/creating-migrating.html) (specifically, take a closer look at [Updating Your Registrar's Name Servers](http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html#Step_UpdateRegistrar)). It may also interest you that Route 53 can also be used for [registering and transferring](http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar.html) domain names to AWS.

## Resources

*   [Sample project](https://github.com/matsev/route53-beanstalk) at GitHub including complete CloudFormation template
*   [AWS::Route53::HostedZone](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-route53-hostedzone.html)
*   [AWS::Route53::RecordSet](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-recordset.html)
*   [Values for Alias Resource Record Sets](http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html)