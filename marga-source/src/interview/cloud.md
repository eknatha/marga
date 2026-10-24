## Explain the shared responsibility model.
level: junior
The provider secures the cloud itself: physical facilities, hardware, and the virtualisation layer. You secure what you put in the cloud: identity and access, data, network configuration, operating system patching on VMs, and application security. The split shifts with the service: more is yours for virtual machines, less for managed databases and serverless.

## What is the difference between IAM users, roles and policies on AWS?
level: junior
Users are long-term identities, usually for people or legacy tools. Roles are assumed temporarily and provide short-lived credentials, used by services, applications and cross-account access. Policies are JSON documents that allow or deny actions on resources. Prefer roles and federated sign-in over access keys, and grant least privilege. An explicit deny always wins.

## How is a security group different from a network ACL?
level: mid
A security group is stateful and attached to an instance or network interface; it only has allow rules, and return traffic is automatically allowed. A network ACL is stateless, attached to a subnet, supports allow and deny rules, and is evaluated in order, so return traffic must be allowed explicitly. Security groups are the primary control, and ACLs an extra layer.

## Compare virtual machines, containers and serverless. How do you choose?
level: mid
VMs give maximum control and suit legacy or special software. Containers give portability and efficient density, and suit microservices and steady workloads. Serverless removes server management and scales to zero, which fits spiky, event-driven work, but has limits on duration, cold starts and cost at constant high volume. Choose by workload shape, team skills, latency needs and cost.

## How would you design a highly available web application on AWS or Azure?
level: mid
Place the application across at least two availability zones behind a load balancer, use auto scaling, keep servers stateless with sessions and files in managed stores, use a managed database with multi-zone failover and backups, and put a CDN in front. Add health checks, monitoring and automated deployment, and decide on a multi-region approach based on the recovery objectives.

## How do you control cloud cost?
level: mid
Tag resources for ownership, set budgets and alerts, review usage with the provider's cost tools, right-size instances, delete idle resources, use commitments for steady load and spot capacity for tolerant work, and set lifecycle rules on storage and retention on logs. Include cost in design reviews and report it to the teams who control it.

## How do you secure a multi-account cloud environment?
level: senior
Use separate accounts or subscriptions for isolation, organise them with an organisation hierarchy, apply guardrails such as service control policies and Azure Policy, centralise logging into a protected archive account, use single sign-on with short-lived credentials, encrypt data with managed keys, and run continuous posture checks. Automate everything with infrastructure as code so controls are reviewable.

## What is the difference between a private endpoint and a public endpoint with firewall rules?
level: senior
A private endpoint gives a cloud service an address inside your virtual network, so traffic stays on the provider's private network and the service can have public access disabled. A public endpoint with IP restrictions still exposes a public address and depends on source IP allow lists. Private endpoints reduce exposure but need DNS and routing planning.
