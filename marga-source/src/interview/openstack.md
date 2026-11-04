## Name the core OpenStack services and what each does.
level: junior
Keystone handles identity, tokens and the service catalog. Nova creates and manages virtual machines. Neutron provides networks, routers, security groups and floating IPs. Glance stores images and Cinder provides block volumes. Swift is object storage, Heat orchestrates stacks and Horizon is the dashboard. They share a database and a message queue, so those are the first places I check when many services fail together.

## What is a project and how do quotas work?
level: junior
A project owns resources such as servers, networks and volumes, and users get roles on it. Quotas set limits per project for things like instances, cores, RAM and floating IPs, so one team cannot use the whole cloud. A quota error is a rule, not a fault. The answer is to free resources, use a smaller flavor or have an admin raise the limit.

## A server is in ERROR with No valid host was found. How do you investigate?
level: mid
I read the fault, then check that nova-compute services are up and enabled, look at free resources per host in Placement, and read the scheduler log for how many hosts each filter removed. Often a large flavor does not fit on any single node, or a host is down or in the wrong aggregate. I fix the specific cause instead of restarting services.

## How do security groups work in Neutron?
level: mid
A security group is a set of allow rules applied to a port, covering ingress and egress. There are no deny rules, so traffic not allowed is dropped. Rules from several groups add up. I keep management ports limited to known ranges or a bastion, reference groups instead of addresses where I can, and remember that a floating IP and a router are separate from the rules.

## How do you handle a server or volume stuck in a transitional state?
level: senior
I read the fault and logs, check whether the target compute or storage service is healthy, and compare the hypervisor and storage backend with the database. Only then do I reset the state, knowing it edits records and does not change reality. A wrong reset can create duplicate writers. I then retry the real operation and add monitoring or a runbook for the cause.

## How do you run upgrades and capacity planning for a private cloud?
level: senior
I upgrade release by release in a test environment with a copy of real data, back up databases and prove a restore, then upgrade the control plane before compute nodes with a rollback plan. For capacity I track used against allocatable per flavor class, keep headroom to lose a node, and watch queue depth, error rates and database health. I communicate maintenance windows and test after each step.
