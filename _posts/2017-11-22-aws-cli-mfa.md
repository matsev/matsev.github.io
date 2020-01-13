---
title: AWS CLI MFA
excerpt: Blog post that describes how you can use a CloudFormation Template and AWS CLI profiles to enforce MFA for AWS CLI users.
categories:
    - cloud
    - security
    - tools
tags: 
    - AWS
    - CLI
    - cloud
    - CloudFormation
    - MFA
    - security
---


AWS CLI MFA, how about that for title? It translates to Amazon Web Services Command Line Interface Multi Factor Authentication when all acronyms are spelled out. If you have enabled MFA for the AWS Console you may know that is fairly [straight forward](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html) once you have created your IAM user, however it is a different story to configure MFA for the AWS CLI tool. This blog post will present a solution for this problem based on a CloudFormation Template and AWS CLI profiles.

## Motivation

If you are using the AWS platform from the command line you have configured your terminal for [CLI access](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) using an AWS Access Key ID and an AWS Secret Access Key. As a result, those values are saved in the `~/.aws/credentials` file, i.e. there is a file in your computer in which the AWS account credentials are stored in plain text. Consequently, if your computer is stolen or hacked, a malicious user can use your credentials and then use the AWS CLI tool to do whatever you are privileged to do in your AWS account. Adding MFA to the CLI access will add a significant hurdle for the intruder since they also need your MFA device in addition to your AWS access keys before he or she can do any harm.

## Outline

Currently, there is not easy way of mandating MFA for AWS CLI users. The trick that will be presented in this blog post is to limit the privileges for users that have not authenticated using MFA and then create a separate role with the desired privileges that requires MFA to be assumed. When the AWS CLI tool user switches to the role, the user is prompted for the TOTP (Time-based One-time Password, e.g. a six digit code that the MFA device presents) before the actual role switch occurs. As a result, the user receives [temporary security credentials](http://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) that are valid for 1 hour. Within that time frame multiple CLI commands can be executed without the need of re-authentication. By utilizing two different [CLI profiles](http://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html) the role switch occurs if the user just provided the correct profile. To summarize:

*   [Create an IAM Role](#admin-role) with the same privileges as the IAM Group. Make sure that the IAM Role requires MFA.
*   [Create an IAM Group](#admin-group) with admin privileges to which we can add users. Make sure that the IAM Group requires MFA.
*   [Create a policy](#manage-mfa-policy) that allows users to manage their MFA configuration.
*   [Create AWS CLI profiles](#aws-cli-profiles) that handle the role switch and MFA authentication for the user.

## Before You Start

I advise that you create a temporary backup user with admin privileges (and verify that it works), _before_ you try the proposed solution. Chances are that you accidentally screw up your own user role or privileges and lock yourself out from the account accordingly. If that happens, you can use the root credentials to restore your access, but it may be easier to have a dedicated temporary user that is deleted once you have completed your IAM configuration. The source code has been published to the [aws-cli-mfa repository in my GitHub account](https://github.com/matsev/aws-cli-mfa). There you will find two role / group pairs, one `AdminMFARole`/`AdminMFAGroup` with full admin privileges that I discuss in detail below. Similarly, there is one `S3MFARole`/`S3MFaGroup` that has full access to S3, but is prohibited from using other AWS services.

## Admin Role

First, we need to create an [AWS::IAM::Role](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html). The privileges of this role will dictate what the AWS CLI user is allowed to do after the role switch.. In this blog post, the role will have admin privileges, but requires MFA ro be assumed, but you create other roles with more limited privileges according to your needs (the example in the [GitHub repository](https://github.com/matsev/aws-cli-mfa) also contains an S3 role). AWS comes with a predefined managed policy [arn:aws:iam::aws:policy/AdministratorAccess](https://console.aws.amazon.com/iam/home#policies/arn:aws:iam::aws:policy/AdministratorAccess) that we can use, but we need to add an assume role policy document with a [Condition](http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition) that MFA is present using one of the [AWS Global and IAM Condition Context Keys](http://docs.aws.amazon.com//IAM/latest/UserGuide/reference_policies_condition-keys.html#AvailableKeys):

```yaml
AdminMFARole:
  Type: AWS::IAM::Role
  Properties:
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/AdministratorAccess
    RoleName: AdminMFARole
    AssumeRolePolicyDocument:
      Version: 2012-10-17
      Statement:
        - Sid: AllowAssumeRoleIfMFAIsPresent
          # see http://docs.aws.amazon.com/cli/latest/userguide/cli-roles.html#cli-roles-mfa
          Effect: Allow
          Principal:
            AWS: !Ref AWS::AccountId
          Action: sts:AssumeRole
          Condition:
            Bool:
              aws:MultiFactorAuthPresent: true
```

## Admin Group

Next step is to create an [AWS::IAM::Group](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-iam-group.html). You can assign which of your IAM users will have admin access by adding them to or removing them from this group. The group is configured with two policies. The first policy allow users in the group to assume the `AdminMFARole` above. Note that this policy should be without MFA requirement. Why? If the user had already been MFA authenticated, there would be no need for the role switch since its sole purpose is to trigger the MFA authentication. The second policy document has the same privileges as the previously mentioned [arn:aws:iam::aws:policy/AdministratorAccess](https://console.aws.amazon.com/iam/home#policies/arn:aws:iam::aws:policy/AdministratorAccess), but it adds MFA requirement. Regrettably, it is not possible to copy an existing policy and just add the MFA condition to it, hence we need to specify a full policy document. This second policy is what gives your AWS Console users administrator privileges if they use MFA as part of the login flow. If you only plan to cater for CLI users, this policy can be omitted.

```yaml
AdminMFAGroup:
  Type: AWS::IAM::Group
  Properties:
    GroupName: AdminMFAGroup
    Policies:

      - PolicyName: AllowAssumeAdminMFAPolicy
        PolicyDocument:
          Version: 2012-10-17
          Statement:
            Sid: AllowUserToAssumeAdminMFARole
            Effect: Allow
            Action: sts:AssumeRole
            Resource: !GetAtt AdminMFARole.Arn

      - PolicyName: AdminMFAPolicy
        # same privileges as the arn:aws:iam::aws:policy/AdministratorAccess, but with MFA requirement
        PolicyDocument:
          Version: 2012-10-17
          Statement:
            Sid: AllowAdminUserToDoAnythingIfMFAIsPresent
            Effect: Allow
            Action: '*'
            Resource: '*'
            Condition:
              Bool:
                aws:MultiFactorAuthPresent: true
```

## Manage MFA Policy

The third step enables MFA self service for all users in the `AdminMFAGroup`. Basically, this policy allows the users to create their own MFA configuration without enforcing MFA in the first place, both using the AWS CLI as well as the AWS Console.

```yaml
ManageMFAPolicy:
  Type: AWS::IAM::ManagedPolicy
  Properties:
    Description: A policy that allows users to manage their personal MFA configuration
    Groups:
      - !Ref AdminMFAGroup
      # add more groups that should have MFA requirement
    ManagedPolicyName: ManageMFAPolicy
    PolicyDocument:
      Version: 2012-10-17
      Statement:

      - Sid: AllowUsersToManageTheirOwnMFADevice
        Effect: Allow
        Action:
        - iam:CreateVirtualMFADevice
        - iam:EnableMFADevice
        - iam:ResyncMFADevice
        Resource:
          # users should only manage their own resources
          - !Join ['', ['arn:aws:iam::', !Ref 'AWS::AccountId', ':mfa/${aws:username}']]
          - !Join ['', ['arn:aws:iam::', !Ref 'AWS::AccountId', ':user/${aws:username}']]

      - Sid: AllowUsersToListMFADevicesAndUsers
        Effect: Allow
        Action:
        - iam:ListMFADevices
        - iam:ListVirtualMFADevices
        - iam:ListUsers
        Resource: "*"
```

## Enforcing MFA

Now the infrastructure is setup, and you can start enforcing MFA for your users.

> **Warning** This is the point where you should create a temporary admin user so that you can make corrections in case you lock yourself out from the account.

*   Add all administrators to the `AdminMFAGroup`.
*   Remove the [AdministratorAccess](https://console.aws.amazon.com/iam/home#policies/arn:aws:iam::aws:policy/AdministratorAccess) policy from all users (if any).
*   Remove the [AdministratorAccess](https://console.aws.amazon.com/iam/home#policies/arn:aws:iam::aws:policy/AdministratorAccess) policy from all groups (if any).

The result depend on whether or not the user already has an active MFA. Non-MFA users are now restricted to just enable MFA, both in the AWS Console and using the AWS CLI. As soon as they have an active MFA device (and have re-login), they will have admin privileges.

## AWS CLI Profiles

All users of the account need to configure their AWS CLI environment with two profiles in order to facilitate the automatic role switch from the command line. Start by creating a [named profile](http://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html) in your `~/.aws/credentials` file in which you provide the AWS Access Key ID and the AWS Secret Access Key:

```bash
[my-project]
aws_access_key_id=AKIAI44QH8DHBEXAMPLE
aws_secret_access_key=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

The second profile is created in the `~.aws/config` file in which you provide a reference to the profile to be use for authentication by using the `source_profile`, an ARN to the role which should be used for role switching and the ARN to your configured MFA device.

```bash
[profile my-project-mfa]
source_profile = my-project
role_arn = arn:aws:iam::123456789012:role/AdminMFARole
mfa_serial = arn:aws:iam::123456789012:mfa/my-user-name
``` 

Of course, you need to change the values of the profile names, AWS Access Key ID, AWS Secret Access Key, role ARN, and the MFA serial to whatever values are applicable for you. One way of getting the MFA serial is to go to the IAM Users and check in the Security Credentials. It will be presented there if the user has configured a MFA device.

## Usage

Finally, all configuration is complete and you can start using your new, MFA enabled, CLI profile. To use a specific profile, you simply specify the profile name after using the `--profile` option. Continuing with the example profile names above, you will find that the `my-project` profile (i.e. the profile without MFA) is no longer allowed to for example list S3 buckets:

```bash
$ aws s3 ls --profile my-project
An error occurred (AccessDenied) when calling the ListBuckets operation: Access Denied
```  

Using the `my-project-mfa` profile on the other hand yields a different behavior:

```bash
$ aws s3 ls --profile my-project-mfa
Enter MFA code:
[user enters valid MFA token]
[a list of S3 buckets is presented]
```

Achievement unlocked, requiring MFA for the AWS CLI! Many times you will execute multiple CLI commands to the same account. You can set the `AWS_PROFILE` environment variable to avoid to repeatedly key in the same profile over and over again, e.g.

```bash
$ export AWS_PROFILE=my-project-mfa
```

## Clean-up

Do not forget to delete your temporary admin user.

## Caveat

One caveat to look out for is that you may have noticed that specified the `AWS::AccountId` as [Principal](http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Principal_specifying) in the `AdminMFARole`. As a consequence, all IAM users and roles in the acconut can assume this role (given that they satisfy the MFA condition). A much better approach would be to use the `AdminMFAGroup` as principal, regrettably AWS does not allow you to use [IAM Group as a principal](http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Principal_specifying). To mitigate this risk, you need to be very careful when you create policies for other groups, roles and users. For example you must make sure to restrict which roles they are allowed to switch to and they should be allowed to manage groups, roles or users. This should not be a surprise to you, if you have worked with AWS before you are probably already familiar with the [principle of least privilege](http://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege).