---
title: Identity, projects and quotas
minutes: 13
summary: Understand users, projects, roles and tokens, how quotas limit a project, and how to read an authentication failure.
---

Before anything is created in OpenStack, someone has to prove who they are and say which project the work belongs to. Keystone handles that.

## What you will learn

- Domains, projects, users and roles
- Tokens, the service catalog and application credentials
- Quotas and how a project hits them
- Reading common authentication errors

## The model

- A **domain** groups users and projects, which lets one cloud serve several organisations.
- A **project** (older name: tenant) owns resources such as servers and networks, and quotas are applied to it.
- A **user** is a person or a service account.
- A **role** is a name such as `admin` or `member`. A user gets a role **on a project**. The same user can be admin on one project and a plain member on another.

Permissions are decided by policy files in each service, which map roles to actions. By default, members can manage resources in their project, and `admin` can manage the whole cloud.

## Tokens and the catalog

You sign in and receive a **token** (a temporary credential), which you present to every service. The token is scoped to one project. The **service catalog** returned with it lists the API endpoints, so the client knows where Nova and Neutron live.

```console
$ env | grep ^OS_
OS_AUTH_URL=https://cloud.example.com:5000/v3
OS_PROJECT_NAME=shop
OS_USERNAME=asha
OS_USER_DOMAIN_NAME=Default
OS_PROJECT_DOMAIN_NAME=Default
$ openstack catalog list -c Name -c Type
+----------+----------+
| Name     | Type     |
+----------+----------+
| keystone | identity |
| nova     | compute  |
| neutron  | network  |
+----------+----------+
```

For automation, prefer **application credentials**: a secret limited to one project and, if you choose, to certain roles, that can be revoked without changing a person's password.

## Quotas

Each project has limits on instances, vCPUs, RAM, volumes, floating IPs, security groups and more. They stop one team from using the whole cloud.

```console
$ openstack quota show -c cores -c instances -c ram
+-----------+-------+
| Resource  | Limit |
+-----------+-------+
| cores     | 20    |
| instances | 10    |
| ram       | 51200 |
+-----------+-------+
$ openstack server create --flavor m1.xlarge --image ubuntu app-9
Quota exceeded for cores: Requested 8, but already used 16 of 20 cores (HTTP 403)
```

A quota error is not a fault in the cloud: it is a rule. The remedies are to delete unused resources, use a smaller flavor, or ask an admin to raise the quota. Raising quotas for everyone to avoid the question removes the protection.

## Reading authentication errors

- **HTTP 401 Unauthorized**: the token or password is wrong or expired. Check the `OS_` variables and the domain names. A password right for one domain fails in another.
- **HTTP 403 Forbidden**: you are authenticated but the policy denies the action for your role. Ask for the right role on the project.
- **Could not find project**: the project name is wrong, or the project is in a different domain.
- **Clock skew**: tokens carry timestamps. A server whose clock is far off will reject valid tokens. Keep NTP running on every node.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Identity, projects and quotas fits together
node: n1 | The model | 0 | 0 | A domain groups users and projects, which lets one cloud serve several organisations. | Using the admin account for everyday work. | process
node: n2 | Tokens and the catalog | 1 | 1 | You sign in and receive a token (a temporary credential), which you present to every service. | Forgetting that names are per domain. | observe
node: n3 | Quotas | 2 | 0 | Each project has limits on instances, vCPUs, RAM, volumes, floating IPs, security groups and more. | Giving the admin role to make an error go away. | process
node: n4 | Reading authentication errors | 3 | 1 | HTTP 401 Unauthorized: the token or password is wrong or expired. | A password right for one domain fails in another. | security
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Everything worked yesterday

> **Incident:** A deployment script began failing at 08:00 with 401 errors.

```console
$ openstack token issue
The request you have made requires authentication. (HTTP 401)
$ openstack --os-cloud ci user show ci-deployer -c enabled -c password_expires_at
+---------------------+---------------------+
| Field               | Value               |
+---------------------+---------------------+
| enabled             | True                |
| password_expires_at | 2026-11-03T00:00:00 |
+---------------------+---------------------+
```

A password policy set 90-day expiry on all users, including the service account used by the pipeline. It had expired at midnight. The team moved the pipeline to an application credential, which they rotate on a schedule they choose, and exempted service users from password expiry rules. Automation should not share a person's login lifecycle.

## Common mistakes

- Using the admin account for everyday work
- Giving the `admin` role to make an error go away
- Sharing one user between pipelines
- Forgetting that names are per domain

```quiz
Q: What owns resources and has quotas in OpenStack?
+ A project
- A token :: Tokens authenticate.
- A flavor :: Flavors describe sizes.
- A hypervisor :: Hypervisors run guests.
> Quotas apply per project.

Q: What does HTTP 403 Forbidden usually mean in OpenStack?
+ You are signed in but policy denies the action for your role
- The password is wrong :: That is 401.
- The server is down :: That is 5xx.
- The image is missing :: That is 404.
> Check your role on the project.

Q: Why are application credentials better for automation?
+ They are limited to a project and can be revoked without changing a person's password
- They never expire :: They can expire.
- They give admin rights :: They do not.
- They need no network :: They do.
> They separate automation from people.

Q: A server create fails with Quota exceeded for cores. What is the correct reading?
+ A project limit was reached, which is a rule rather than a fault
- Nova is broken :: It is working.
- The image is corrupt :: No.
- Keystone is down :: No.
> Free resources, use a smaller flavor or ask for more quota.
```

```cards
Project :: owner of resources and quotas
Domain :: group of users and projects
Role :: permission label granted on a project
Token :: temporary credential
Service catalog :: list of service endpoints
Application credential :: revocable secret for automation
```
