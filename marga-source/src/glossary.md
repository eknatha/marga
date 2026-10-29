## Kernel
module: linux
plain: The core of the operating system that talks to the hardware.
def: The part of the OS that manages CPU, memory, devices and processes for every program.

## Process
module: linux
plain: A program that is currently running.
def: A running instance of a program, with its own ID (PID), memory and open files.

## Daemon
module: linux
plain: A program that runs quietly in the background.
def: A long-running background process, often started at boot and managed by systemd.
aliases: service

## Inode
module: linux
plain: The record that describes a file but not its name.
def: A filesystem structure that stores a file's owner, permissions, size and where its data lives. Running out of inodes stops file creation even when space is free.

## Mount point
module: linux
plain: The folder where a disk or drive is attached.
def: A directory where a filesystem is attached to the directory tree.
aliases: mount

## Permissions
module: linux
plain: Who may read, write or run a file.
def: Read, write and execute bits for the owner, the group and everyone else.
aliases: chmod

## Root
module: linux
plain: The all-powerful administrator account.
def: The superuser account (UID 0) that can do anything on the system. Also the top of the filesystem, written /.
aliases: superuser

## Sudo
module: linux
plain: A way to run one command with administrator rights.
def: A command that lets a permitted user run another command as root and records that it happened.

## Systemd
module: linux
plain: The program that starts and watches services on modern Linux.
def: The init system and service manager that starts services at boot, restarts them and collects their logs.
aliases: systemctl

## Journal
module: linux
plain: The place where system logs are collected.
def: The systemd log store, read with journalctl.
aliases: journalctl

## Swap
module: linux
plain: Disk space used when memory is full.
def: Disk space the kernel uses as overflow when RAM is short. Heavy swapping makes a machine very slow.

## Load average
module: linux
plain: A rough measure of how busy the machine is.
def: The average number of processes running or waiting to run over 1, 5 and 15 minutes.

## Signal
module: linux
plain: A short message sent to a process.
def: A notification to a process, such as SIGTERM (please stop) or SIGKILL (stop now).
aliases: SIGTERM

## Cron
module: linux
plain: A scheduler that runs commands at set times.
def: A service that runs jobs on a schedule written as five time fields.
aliases: crontab

## Pipe
module: linux
plain: A way to feed one command's output into another.
def: The vertical bar symbol, which connects the output of one command to the input of the next.

## Package manager
module: linux
plain: The tool that installs and updates software.
def: A tool such as apt, dnf or yum that installs software and its dependencies from repositories.
aliases: apt, dnf

## Shell
module: bash
plain: The program that reads the commands you type.
def: A command interpreter such as bash that runs commands and scripts.

## Exit code
module: bash
plain: A number a command returns to say how it went.
def: A number from 0 to 255 returned when a command ends. Zero means success.
aliases: exit status

## Variable
module: bash
plain: A named box that holds a value.
def: A name that stores a value you can use later in a script.

## Environment variable
module: bash
plain: A setting passed to every program you start.
def: A named value exported to child processes, such as PATH or HOME.
aliases: env var

## Shebang
module: bash
plain: The first line of a script that names its interpreter.
def: A first line such as #!/usr/bin/env bash that tells the system which program runs the script.

## Quoting
module: bash
plain: Putting quotes around text so the shell leaves it alone.
def: Using quotes to stop the shell from splitting words or expanding special characters.

## Idempotent
module: bash
plain: Safe to run again and again with the same result.
def: An operation that gives the same end state however many times it runs. Good scripts and automation aim for this.
aliases: idempotency

## Glob
module: bash
plain: A pattern with wildcards that matches file names.
def: A pattern such as *.log that the shell expands into matching file names.
aliases: wildcard

## Stdout
module: bash
plain: The normal output of a command.
def: Standard output, the stream where a command writes its results.
aliases: stderr, stdin

## Virtual environment
module: python
plain: A private folder of Python packages for one project.
def: An isolated Python install with its own packages so projects do not clash.
aliases: venv

## Dependency
module: python
plain: Something your code needs to work.
def: A library or package that your program relies on.

## JSON
module: python
plain: A common text format for data.
def: JavaScript Object Notation, a text format of keys and values used by most APIs.

## YAML
module: python
plain: A readable text format for settings.
def: A human-friendly data format that uses indentation. Used by Kubernetes and many CI tools.

## API
module: python
plain: A set of rules for one program to talk to another.
def: Application programming interface: a defined way to request data or actions from a service.
aliases: REST

## HTTP
module: python
plain: The language of the web.
def: The protocol browsers and APIs use to request and send pages and data.

## Exception
module: python
plain: An error that stops a program unless it is handled.
def: An error raised while code runs, which can be caught with try and except.

## Unit test
module: python
plain: A small automatic check of one piece of code.
def: A test that checks a single function or class on its own.
aliases: pytest

## Package
module: python
plain: A bundle of code you can install.
def: A distributable set of Python modules, installed with pip.
aliases: pip

## IP address
module: networking
plain: The number that identifies a machine on a network.
def: A number such as 10.0.0.5 that identifies a network interface.

## CIDR
module: networking
plain: A short way to write a range of IP addresses.
def: Classless Inter-Domain Routing notation such as 10.0.0.0/24, where the number after the slash is how many leading bits are the network.
aliases: subnet mask

## Subnet
module: networking
plain: A smaller section of a network.
def: A range of IP addresses that share the same network prefix.

## Gateway
module: networking
plain: The door out of your network.
def: The router address a machine sends traffic to when the destination is on another network.

## DNS
module: networking
plain: The phone book of the internet.
def: The Domain Name System, which turns names such as example.com into IP addresses.

## TCP
module: networking
plain: A reliable way to send data in order.
def: A protocol that sets up a connection, numbers the data and retransmits what is lost.

## UDP
module: networking
plain: A fast way to send data with no guarantees.
def: A connectionless protocol with no delivery or ordering guarantee, used by DNS and streaming.

## Port
module: networking
plain: A numbered door on a machine.
def: A number that says which program on a machine should receive the traffic.

## NAT
module: networking
plain: A trick that lets many machines share one public address.
def: Network address translation: a router rewrites addresses so private hosts can reach the internet.

## Firewall
module: networking
plain: A guard that allows or blocks traffic.
def: A system that permits or denies network traffic by rules on address, port and protocol.
aliases: security group

## Load balancer
module: networking
plain: A traffic director that spreads requests over servers.
def: A service that distributes incoming requests across several backends and checks their health.

## Proxy
module: networking
plain: A middleman that forwards requests.
def: A server that sits between a client and a destination and forwards traffic for it.
aliases: reverse proxy

## TLS
module: networking
plain: The lock that keeps web traffic private.
def: Transport Layer Security: encryption and identity checks for network connections. It is what makes HTTPS secure.
aliases: HTTPS, SSL

## Latency
module: networking
plain: How long a request takes.
def: The delay between sending a request and getting a response.

## Bandwidth
module: networking
plain: How much data can flow at once.
def: The maximum amount of data a link can carry per second.

## MTU
module: networking
plain: The biggest packet a link will carry.
def: Maximum transmission unit: the largest packet size, in bytes, that a link accepts without splitting.

## VPN
module: networking
plain: A private tunnel across a public network.
def: A virtual private network that encrypts traffic between two points.

## Container
module: docker
plain: A packaged program that runs in isolation.
def: A running, isolated process with its own filesystem view, built from an image.

## Image
module: docker
plain: The template a container starts from.
def: A read-only package of files and settings used to create containers.

## Dockerfile
module: docker
plain: The recipe for building an image.
def: A text file of instructions that builds an image layer by layer.

## Layer
module: docker
plain: One step in an image.
def: A read-only filesystem change created by one Dockerfile instruction. Layers are cached and shared.

## Registry
module: docker
plain: A store for images.
def: A server that stores and serves container images, such as Docker Hub or a cloud registry.

## Volume
module: docker
plain: Storage that outlives a container.
def: A managed directory kept outside the container so data survives restarts.

## Namespace
module: docker
plain: A wall that separates what a process can see.
def: A Linux feature that gives a process its own view of things such as processes or networks. Kubernetes also uses the word for a group of resources.

## Cgroup
module: docker
plain: A limit on how much a process may use.
def: A Linux feature that limits and measures CPU, memory and I/O for a group of processes.

## Multi-stage build
module: docker
plain: A build that leaves the tools behind.
def: A Dockerfile with several stages so the final image holds only what is needed to run.

## Pipeline
module: cicd
plain: An automatic line of build, test and deploy steps.
def: A series of automated stages that takes a code change to production.

## CI
module: cicd
plain: Automatically building and testing every change.
def: Continuous integration: merging changes often and running automatic builds and tests.
aliases: continuous integration

## CD
module: cicd
plain: Automatically getting changes released.
def: Continuous delivery or deployment: automating the path from a passing build to production.
aliases: continuous delivery

## Artifact
module: cicd
plain: The file a build produces.
def: A build output such as an image, package or binary that is stored and deployed.

## Canary release
module: cicd
plain: Trying a change on a few users first.
def: A rollout that sends a small share of traffic to the new version and watches it before going wider.
aliases: canary

## Blue-green deployment
module: cicd
plain: Two copies of production, switched at once.
def: Running the old and new versions side by side and moving traffic from one to the other.

## Rollback
module: cicd
plain: Going back to the last good version.
def: Restoring the previous release after a bad deployment.

## Feature flag
module: cicd
plain: A switch that turns a feature on or off without a deploy.
def: A runtime setting that enables or disables code for some or all users.

## Secret
module: cicd
plain: A password or key that must stay private.
def: A sensitive value such as a token or key that must not be stored in plain code.

## Branch
module: cicd
plain: A separate line of work on the code.
def: A named line of development that can be merged back into the main line.

## Pod
module: kubernetes
plain: The smallest thing Kubernetes runs.
def: One or more containers that share a network address and storage and run together.

## Node
module: kubernetes
plain: A machine in the cluster.
def: A worker machine, physical or virtual, that runs pods.

## Cluster
module: kubernetes
plain: A group of machines run as one.
def: The control plane plus the worker nodes that Kubernetes manages together.

## Control plane
module: kubernetes
plain: The brain of the cluster.
def: The components that decide and record what should run: API server, scheduler, controllers and etcd.

## Deployment
module: kubernetes
plain: A manager that keeps the right number of pods running.
def: A Kubernetes object that declares the desired pods and handles rolling updates and rollbacks.

## ReplicaSet
module: kubernetes
plain: The part that keeps the pod count right.
def: An object that makes sure a set number of identical pods is running.

## Service
module: kubernetes
plain: A steady address for a changing set of pods.
def: A Kubernetes object that gives pods a stable name and IP and load balances across them.

## Ingress
module: kubernetes
plain: A way to bring web traffic into the cluster.
def: An object that routes external HTTP and HTTPS requests to services by host and path.

## ConfigMap
module: kubernetes
plain: Settings kept outside the image.
def: An object that stores non-secret configuration for pods.

## Kubernetes Secret
module: kubernetes
plain: A place for private values in the cluster.
def: An object that stores sensitive data such as tokens. By default it is only base64 encoded, not encrypted.

## Namespace (Kubernetes)
module: kubernetes
plain: A folder inside the cluster.
def: A way to divide a cluster into separate areas for names, quotas and access.

## Probe
module: kubernetes
plain: A health check for a container.
def: A check Kubernetes runs to see if a container is alive (liveness), ready for traffic (readiness) or finished starting.
aliases: readiness probe, liveness probe

## Helm
module: kubernetes
plain: A package manager for Kubernetes.
def: A tool that installs applications from templated bundles called charts.
aliases: chart

## kubectl
module: kubernetes
plain: The command that controls Kubernetes.
def: The command-line tool for talking to the Kubernetes API.

## etcd
module: kubernetes
plain: The cluster's memory.
def: The key-value database where Kubernetes stores all cluster state.

## Taint
module: kubernetes
plain: A marker that keeps pods away from a node.
def: A node setting that repels pods unless they carry a matching toleration.
aliases: toleration

## HPA
module: kubernetes
plain: Automatic scaling by load.
def: Horizontal Pod Autoscaler: adds or removes pod replicas based on metrics such as CPU.
aliases: autoscaling

## RBAC
module: kubernetes
plain: Rules about who may do what.
def: Role-based access control: permissions granted to users and service accounts through roles.

## Infrastructure as code
module: terraform
plain: Building servers from files, not clicks.
def: Describing infrastructure in version-controlled files so it can be created and changed repeatably.
aliases: IaC

## Provider
module: terraform
plain: The plug-in that talks to a platform.
def: A Terraform plug-in that manages resources on a platform such as AWS or Azure.

## Resource
module: terraform
plain: One thing Terraform manages.
def: A single piece of infrastructure, such as a server or a bucket, declared in code.

## State
module: terraform
plain: Terraform's record of what exists.
def: A file that maps your code to the real resources Terraform manages. Keep it safe and shared.
aliases: tfstate

## Plan
module: terraform
plain: A preview of the changes.
def: The output of terraform plan, which shows what would be created, changed or destroyed.

## Apply
module: terraform
plain: Making the planned changes real.
def: The command that carries out the plan against the real infrastructure.

## Module
module: terraform
plain: A reusable bundle of Terraform code.
def: A folder of Terraform files that you call with inputs and outputs, like a function.

## Drift
module: terraform
plain: When reality no longer matches the code.
def: A difference between the real infrastructure and what the code and state describe, usually from manual changes.

## Backend
module: terraform
plain: Where the state is stored.
def: The place Terraform keeps its state, such as a remote bucket with locking.
aliases: remote state

## Region
module: cloud
plain: A geographic area of a cloud.
def: A location that holds several data centres, such as us-east-1.

## Availability zone
module: cloud
plain: One data centre group inside a region.
def: An isolated location within a region with its own power and network. Spreading across zones survives a zone failure.
aliases: AZ

## IAM
module: cloud
plain: The system that controls who can do what in the cloud.
def: Identity and access management: users, roles and policies that grant permissions.
aliases: role, policy

## Least privilege
module: cloud
plain: Give only the access that is needed.
def: A rule that every user and program should have the minimum permissions needed for its job.

## VPC
module: cloud
plain: Your own private network in the cloud.
def: A virtual private cloud: an isolated network with your own address ranges, subnets and routes.
aliases: virtual network

## Security group
module: cloud
plain: A firewall on one resource.
def: A stateful set of allow rules attached to a cloud resource.

## Object storage
module: cloud
plain: Storage for files kept as objects.
def: A service such as S3 that stores objects by key rather than as a disk.
aliases: S3, blob storage

## Auto scaling
module: cloud
plain: Adding and removing servers by demand.
def: Automatically changing the number of instances to match load.

## Spot instance
module: cloud
plain: Cheap spare capacity that can be taken away.
def: A discounted instance the provider can reclaim with short notice.

## Serverless
module: cloud
plain: Running code without managing servers.
def: A model where the provider runs and scales your code and you pay per use.
aliases: function

## Egress
module: cloud
plain: Data leaving the cloud.
def: Traffic out of a cloud network, which often costs money.

## CDN
module: cloud
plain: A network of caches near users.
def: A content delivery network that stores copies of content close to users to cut latency.

## Metric
module: observability
plain: A number measured over time.
def: A numeric measurement sampled regularly, such as requests per second.

## Log
module: observability
plain: A written record of events.
def: A time-stamped line or record of something that happened in a program.

## Trace
module: observability
plain: The path of one request.
def: A record of the steps a single request took across services.
aliases: distributed tracing

## Prometheus
module: observability
plain: A system that collects metrics.
def: An open source monitoring system that scrapes metrics and stores them as time series.

## Grafana
module: observability
plain: A tool for dashboards.
def: A tool for drawing charts and dashboards from many data sources.

## Alert
module: observability
plain: A message that something needs attention.
def: A notification triggered when a rule on your data is met.

## Cardinality
module: observability
plain: How many different values a label can take.
def: The number of unique label combinations in a metric. Too many exhaust memory.

## Histogram
module: observability
plain: A way to measure how values spread.
def: A metric that counts observations in buckets, used for latency percentiles.
aliases: percentile

## Dashboard
module: observability
plain: A screen of charts about a system.
def: A page of graphs and numbers that shows the health of a service.

## OpenTelemetry
module: observability
plain: A standard way to collect telemetry.
def: An open standard and set of tools for producing metrics, logs and traces.
aliases: OTel

## SLI
module: sre
plain: A number that measures how well a service works.
def: Service level indicator: a measurement of service quality, such as the share of requests that succeed.

## SLO
module: sre
plain: The target for that number.
def: Service level objective: the goal for an SLI over a time window, such as 99.9% of requests succeed in 30 days.

## SLA
module: sre
plain: A promise to customers, often with penalties.
def: Service level agreement: a contract that states a level of service and what happens if it is missed.

## Error budget
module: sre
plain: How much failure you can afford.
def: The amount of unreliability an SLO allows, such as 43.2 minutes a month at 99.9%.

## Toil
module: sre
plain: Repetitive manual work that adds no lasting value.
def: Manual, repetitive, automatable work that grows with the service and has no enduring value.

## Incident
module: sre
plain: An event that harms the service.
def: An unplanned event that disrupts or degrades a service.
aliases: outage

## Postmortem
module: sre
plain: A write-up of what went wrong and what to fix.
def: A blameless review of an incident that records the timeline, causes and follow-up actions.
aliases: post-incident review

## On-call
module: sre
plain: Being the person who responds to alerts.
def: A rotation where engineers are available to respond to pages outside normal hours.
aliases: pager

## Runbook
module: sre
plain: A step-by-step guide for a known problem.
def: A document with the steps to diagnose and fix a specific alert or task.
aliases: playbook

## MTTR
module: sre
plain: How long fixing usually takes.
def: Mean time to recovery: the average time from the start of an incident to service restoration.

## RTO
module: sre
plain: How long you can be down.
def: Recovery time objective: the longest acceptable time to restore service after a disaster.

## RPO
module: sre
plain: How much data you can lose.
def: Recovery point objective: the longest acceptable period of data loss, measured in time.

## Blast radius
module: sre
plain: How much a failure can hurt.
def: The size of the part of a system or customer base that a failure or change can affect.

## Chaos engineering
module: sre
plain: Breaking things on purpose to learn.
def: Running controlled experiments that inject failure to test that a system copes.

## Graceful degradation
module: sre
plain: Working in a reduced way instead of failing.
def: Keeping core features working while turning off or slowing non-essential ones under stress.

## Retry storm
module: sre
plain: Many retries that make an outage worse.
def: A surge of repeated requests from clients that overloads a recovering service.
aliases: backoff

## Circuit breaker
module: sre
plain: A switch that stops calling a failing service.
def: A pattern that stops requests to a failing dependency for a while so it can recover.


## SBOM
module: security
plain: A parts list for software.
def: A software bill of materials lists every component and version inside an artifact, so you can tell quickly whether a newly announced vulnerability affects you.

## STRIDE
module: security
plain: A checklist of six kinds of threat.
def: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service and Elevation of privilege, used to ask what can go wrong in a design.

## SAST
module: security
plain: Scanning source code for unsafe patterns.
def: Static application security testing analyses code without running it and flags patterns such as injection and unsafe functions.

## Software supply chain
module: security
plain: Everything that goes into building and delivering your software.
def: The libraries, base images, build tools, runners and pipelines that produce an artifact. An attack on any of them can reach production.

## Provenance
module: security
plain: A record of where an artifact came from.
def: Signed metadata that states which source, builder and inputs produced an artifact, which lets a deployment verify it.

## Network policy
module: security
plain: A firewall rule for pods.
def: A Kubernetes object that controls which pods may talk to which other pods and endpoints. A default deny policy blocks all traffic until others allow it.

## Zero trust
module: security
plain: Do not trust a request because of where it comes from.
def: A model in which every request is authenticated and authorized using identity, device state and policy, with least privilege and continuous logging, instead of trusting the internal network.

## OIDC
module: security
plain: A standard way to sign in with an identity provider.
def: OpenID Connect, an identity layer on top of OAuth 2.0 that returns an ID token describing the authenticated user.

## Mutual TLS
module: security
plain: Both sides of a connection show a certificate.
def: TLS in which the client also presents a certificate, so each service can verify exactly who is calling it.

## Passkey
module: security
plain: A phishing-resistant sign-in key stored on a device.
def: A credential based on public key cryptography that is bound to the real site address, so a look-alike site cannot use it.

## Policy as code
module: security
plain: Security rules written so a machine can check them.
def: Rules expressed in a language such as Rego or in Kubernetes policy objects, versioned and enforced automatically in pipelines, admission control and cloud accounts.

## Immutable backup
module: security
plain: A backup nobody can delete early.
def: A copy protected by a retention lock so it cannot be changed or removed until the retention period ends, even by an administrator.

## Egress filtering
module: security
plain: Controlling what your servers may connect to.
def: Limiting outbound traffic to approved destinations so a compromised host cannot easily download tools or send data out.

## Subdomain takeover
module: security
plain: Someone claims a name you forgot to clean up.
def: An attack on a DNS record that points to a deleted cloud resource, which lets another party serve content under your domain.

## Inventory
module: ansible
plain: The list of servers Ansible manages.
def: A file or dynamic source that names hosts and groups, and holds variables for them.

## Playbook
module: ansible
plain: A recipe of tasks for your servers.
def: A YAML file with one or more plays, each mapping hosts to an ordered list of tasks.

## Idempotent task
module: ansible
plain: Doing it twice gives the same result as doing it once.
def: A property of a task or module: after the desired state exists, running again changes nothing.

## Handler
module: ansible
plain: A job that runs only if something changed.
def: A task triggered by notify, run once at the end of a play, typically to reload or restart a service.

## Ansible Role
module: ansible
plain: A reusable box of related jobs.
def: A directory layout of tasks, handlers, templates, defaults and files for one purpose, reusable across playbooks.

## Ansible Vault
module: ansible
plain: A lock for secrets stored with your recipes.
def: Ansible's encryption of files or values, opened with a vault password kept outside the repository.

## Primary key
module: databases
plain: The unique label of a row.
def: A column or set of columns that uniquely identifies each row in a table and cannot be null.

## Index
module: databases
plain: A shortcut for finding rows quickly.
def: A sorted structure maintained by the database that avoids scanning the whole table, at the cost of space and slower writes.

## Transaction
module: databases
plain: A bundle of changes that succeed or fail together.
def: A group of statements applied atomically, with isolation from concurrent work and durability once committed.

## Write-ahead log
module: databases
plain: A diary of changes written before the data.
def: A sequential log of changes flushed to disk before commit, used for crash recovery, replication and point-in-time recovery.

## Replication lag
module: databases
plain: How far behind a copy is.
def: The delay between a change on the primary and its application on a replica.

## Connection pooler
module: databases
plain: A shared set of database connections.
def: A proxy such as PgBouncer that multiplexes many client connections onto few server connections.

## Split brain
module: databases
plain: Two servers both think they are the boss.
def: A failure where two nodes both accept writes as primary, producing conflicting data.

## Cache stampede
module: databases
plain: Everyone rebuilds the same expired answer at once.
def: Many requests miss on an expired hot key simultaneously and overload the source of truth.

## Commit
module: git
plain: A saved snapshot of your project with a message.
def: An object in Git that records the state of all tracked files at one moment, plus an author, a timestamp, a message and a pointer to its parent commit.

## Git branch
module: git
plain: A movable label on a line of work.
def: A lightweight pointer to a commit that moves forward as you commit, used to develop changes in parallel and merge them later.

## Staging area
module: git
plain: The draft of your next commit.
def: Also called the index. It holds the changes selected with git add that will be included in the next commit.

## Merge
module: git
plain: Combining the work of two branches.
def: An operation that joins the histories of two branches, either by moving the pointer forward (fast-forward) or by creating a merge commit with two parents.

## Rebase
module: git
plain: Replaying your commits on top of newer work.
def: An operation that moves a branch to a new base commit and recreates its commits there, producing new commit hashes and a linear history.

## Remote
module: git
plain: A named link to another copy of the repository.
def: A reference to a repository elsewhere, such as origin, used with fetch, pull and push to share commits.

## Pull request
module: git
plain: A request to merge your branch, with review.
def: A feature of hosting platforms where one branch is proposed for merging into another, with discussion, review and automated checks (also called a merge request).

## Reflog
module: git
plain: Git's private journal of where your branches pointed.
def: A local log of every movement of HEAD and branch tips, used to recover commits after resets, rebases and deleted branches.

## Tag
module: git
plain: A permanent name for one commit.
def: A fixed reference to a commit, usually a release such as v1.4.0. Annotated tags also record a tagger, date and message and can be signed.

## HEAD
module: git
plain: Where you are now in the history.
def: A reference to the currently checked out commit, normally through a branch name. When it points directly to a commit it is called a detached HEAD.

## Goroutine
module: go
plain: A very light thread run by Go itself.
def: A function running concurrently, scheduled by the Go runtime. Goroutines are cheap, but one that never stops is a leak.

## Channel
module: go
plain: A pipe that goroutines use to pass values.
def: A typed conduit for sending and receiving values between goroutines. Unbuffered channels synchronise sender and receiver.

## Context
module: go
plain: A signal that says stop or time is up.
def: A value passed through calls that carries cancellation, deadlines and request data. It is the standard way to stop work in Go.

## Interface
module: go
plain: A list of methods a type must have.
def: A set of method signatures. Any type with those methods satisfies it implicitly, without declaring so.

## Defer
module: go
plain: Run this when the function finishes.
def: A statement that schedules a call to run when the surrounding function returns, commonly used to close files and unlock mutexes.

## Chart
module: helm
plain: A package of Kubernetes templates.
def: A directory or archive with Chart.yaml, default values and templates that Helm renders into Kubernetes manifests.

## Release
module: helm
plain: One installed copy of a chart.
def: A named installation of a chart in a cluster, with its own values and numbered revision history.

## Values
module: helm
plain: The settings that fill in a chart.
def: Configuration passed to templates, from the chart defaults, values files and command line overrides.

## Subchart
module: helm
plain: A chart that another chart depends on.
def: A dependency installed as part of the parent chart release, configured through values under its name.

## Helm rollback
module: helm
plain: Go back to an earlier release revision.
def: A command that creates a new revision applying an earlier manifest. It restores objects but not data.

## Token
module: llm
plain: A small piece of text that models read and count.
def: The unit a model reads and writes, roughly four characters of English. Limits and prices are measured in tokens.

## Context window
module: llm
plain: How much text the model can look at in one request.
def: The maximum number of tokens in one request, covering the prompt, history, documents, tool results and the answer.

## Hallucination
module: llm
plain: A confident answer that is not true.
def: Fluent output that is not supported by the input or by facts. It is reduced by supplying source text and allowing the model to say it does not know.

## Temperature
module: llm
plain: A setting for how adventurous the wording is.
def: A sampling setting. Low values make the most likely token win almost always, while higher values give more varied output.

## Prompt caching
module: llm
plain: Reusing a repeated start of a prompt at lower cost.
def: A feature that stores a stable prefix of a prompt so repeated requests cost less and start faster.

## Few-shot prompt
module: prompting
plain: A prompt that includes a few worked examples.
def: A prompt with several examples that show the format and style wanted. With none it is zero-shot.

## Structured output
module: prompting
plain: An answer in a fixed shape such as JSON.
def: Model output that follows a schema so programs can read it, obtained by schema-constrained output, forced tool use or careful prompting, then validated.

## JSON Schema
module: prompting
plain: A description of what valid JSON looks like.
def: A standard format for describing the types, required fields and allowed values of JSON data, used to validate output and define tool inputs.

## Prompt injection
module: prompting
plain: Text that tries to give the model new orders.
def: Content that attempts to override the intended instructions of an AI system. It can arrive through documents, web pages or tool results, so systems must limit what a fooled model can do.

## Evaluation set
module: prompting
plain: A collection of test cases for an AI feature.
def: A saved set of realistic inputs with expected properties, used to compare prompts and models and to catch regressions.

## Skill
module: claude-skills
plain: A folder of instructions Claude loads when needed.
def: A folder with a SKILL.md file and optional resources and scripts, whose description lets Claude decide when to load it.

## SKILL.md
module: claude-skills
plain: The main file of a skill.
def: A Markdown file with a header giving the skill name and description, followed by instructions for Claude.

## Progressive disclosure
module: claude-skills
plain: Show details only when they are needed.
def: Loading information in layers: metadata first, the skill body when triggered, and linked files or scripts only on demand.

## Trigger
module: claude-skills
plain: What makes a skill get used.
def: The match between a request and a skill description that causes Claude to load the skill.

## Skill sandbox
module: claude-skills
plain: A restricted place to test an unknown skill.
def: An environment with limited files and network access in which a skill is run safely before it is trusted.

## Tool use
module: mcp
plain: The model asks your code to run a function.
def: A pattern where the model requests a defined tool with arguments, the application runs it and returns the result, and the model continues.

## MCP
module: mcp
plain: A standard way to plug tools into AI apps.
def: The Model Context Protocol, an open protocol based on JSON-RPC that lets AI applications connect to servers exposing tools, resources and prompts.
aliases: Model Context Protocol

## MCP server
module: mcp
plain: A program that offers tools and data over MCP.
def: A program that exposes tools, resources and prompts to MCP clients over stdio or HTTP.

## Tool result
module: mcp
plain: The answer your code sends back to the model.
def: A message block that returns the output or error of a tool call, matched to the call by its ID.

## Excessive agency
module: mcp
plain: Giving an AI more power than it needs.
def: A risk where a model-driven system has broader permissions or tools than its task requires, so mistakes or injected instructions can cause harm.

## Principal
module: cloud-iam
plain: The person or workload making a request.
def: The identity that asks to perform an action, such as a user, a role session or a service.

## Role
module: cloud-iam
plain: An identity you assume for a short time.
def: An identity with permissions and a trust policy that trusted principals can assume to receive temporary credentials.

## Managed identity
module: cloud-iam
plain: An Azure identity managed for a resource.
def: An identity that Azure creates and manages for a resource so it can obtain tokens without stored secrets.

## KMS
module: cloud-iam
plain: A service that makes and guards encryption keys.
def: Key Management Service: creates and uses encryption keys without exposing key material, with policies controlling use.

## Audit trail
module: cloud-iam
plain: The record of who did what in the cloud.
def: Logs of management actions, such as CloudTrail or the Azure Activity Log, used for detection and investigation.

## PodDisruptionBudget
module: k8s-ops
plain: A promise about how many pods stay up during maintenance.
def: An object that limits voluntary disruption of an application's pods, honoured by node drains.

## ResourceQuota
module: k8s-ops
plain: A cap on what a namespace can use.
def: An object that limits total resource requests, limits or object counts in a namespace.

## Application
module: argocd
plain: What Argo CD delivers.
def: A custom resource that names a source in a repository and a destination cluster and namespace.

## Sync
module: argocd
plain: Making the cluster match the repository.
def: The act of applying the desired state from the source to the destination cluster.

## Self-heal
module: argocd
plain: Automatically undoing manual changes.
def: A sync policy that reverts live changes made outside the repository.

## ApplicationSet
module: argocd
plain: A template that creates many applications.
def: A controller resource that generates Applications from a template and generators.

## AppProject
module: argocd
plain: A boundary for a team's applications.
def: A resource that limits which repositories, destinations and resource kinds applications may use.

## Cordon
module: k8s-ops
plain: Stop new pods landing on a node.
def: Marking a node unschedulable so no new pods are placed on it while existing pods keep running.

## Drain
module: k8s-ops
plain: Move pods off a node safely.
def: Evicting the pods from a node, respecting disruption budgets, so they are recreated elsewhere before maintenance.

## Admission controller
module: k8s-ops
plain: A check that runs before an object is saved.
def: A stage in the API server that can validate or change a request after authorisation and before storage.
