---
title: Jenkins: controllers, agents and jobs
minutes: 13
summary: Understand how a Jenkins controller schedules work on agents, what a job and a build are, and where Jenkins keeps its state.
---

Jenkins is the long-lived, self-hosted CI server that many companies still run. Before writing a pipeline it helps to know the moving parts, because most Jenkins problems are really problems with the controller, an agent or the disk they share.

## What you will learn

- What the controller and agents each do
- The difference between a job, a build, a node and an executor
- Where Jenkins keeps its configuration and history
- Why builds should not run on the controller

## The two roles

The **controller** (older docs say master) serves the web interface, stores configuration, holds the build queue, keeps credentials and decides where each build runs. An **agent** is any machine or container that connects to the controller and runs build steps. Each agent offers a number of **executors**, and each executor runs one build at a time.

```diagram
title: How a Jenkins build is scheduled
node: trigger | Trigger | 0 | 0 | A push, a schedule, a webhook or a click starts a build. | A missed webhook means no build and no error. Check the repository hook deliveries.
node: controller | Controller | 1 | 0 | Keeps the queue, picks an agent by label and stores the result. | If it is overloaded or its disk is full, nothing in Jenkins works.
node: agent | Agent | 2 | 0 | Connects to the controller and runs the steps in a workspace. | An offline or mislabelled agent leaves builds waiting in the queue.
node: home | JENKINS_HOME | 1 | 1 | Configuration, job definitions, build history and secrets on disk. | Without a backup, a lost disk means losing every job and credential. | store
node: result | Result | 2 | 1 | Logs, test reports and artifacts are sent back and kept. | Unlimited history fills the disk; set build discard rules.
edge: trigger | controller
edge: controller | agent
edge: agent | result
edge: controller | home
```

## Jobs, builds and nodes

A **job** (also called a project) is the definition: where the code is, when to run, what steps to take. A **build** is one run of a job, numbered 1, 2, 3 and so on, with its own log and workspace. A **node** is a machine that can run builds, and a **label** such as `linux-docker` lets a job ask for the kind of node it needs instead of a named machine.

## Where state lives

Everything that matters sits in the `JENKINS_HOME` directory: `config.xml`, `jobs/` with each job's configuration and build records, `credentials.xml` and `secrets/` for encrypted secrets, `plugins/` and `nodes/`. A good backup copies this directory (minus the large workspaces), and an equally good habit is to describe the configuration as code so the controller can be rebuilt from a file.

## Why the controller runs no builds

Set the number of executors on the built-in node to 0. Builds then go to agents, and a runaway test cannot take the web interface down. It also means build code never runs on the machine that holds every credential, which is a security rule as much as a stability one.

```console
$ ls /var/lib/jenkins
config.xml  credentials.xml  jobs  nodes  plugins  secrets  users  workspace
$ du -sh /var/lib/jenkins/jobs/*  | sort -h | tail -2
4.1G  /var/lib/jenkins/jobs/api-build
18G   /var/lib/jenkins/jobs/nightly-e2e
```

## Incident: The nightly job that filled the disk

> **Incident:** A job kept every build and its artifacts forever, and the controller disk filled up on a Friday night.

```console
$ df -h /var/lib/jenkins
/dev/sda1  100G  100G  0  100%
java.io.IOException: No space left on device
Build queue: 47 waiting, 0 running
```

Builds stopped starting and the log said nothing useful in the web page because Jenkins could not write it. The fix was to delete old builds by hand, then set a discard rule keeping the last 20 builds and 14 days of artifacts, and to alert when the disk passes 70 percent.

## Common mistakes

- Running builds on the controller
- Never setting a build discard policy
- Treating JENKINS_HOME as unimportant and not backing it up
- Naming agents by machine instead of using labels

```quiz
Q: What does an executor do?
+ Runs one build at a time on a node
- Stores credentials :: No.
- Serves the web page :: No.
- Holds the plugin list :: No.
> An agent offers executors; each runs one build.

Q: Where does Jenkins keep job configuration and build history?
+ In the JENKINS_HOME directory
- In the agent workspace :: No.
- In the Git repository only :: No.
- In a browser cache :: No.
> The controller stores its state on its own disk.

Q: Why set the controller's executors to 0?
+ So builds run on agents and cannot starve or expose the controller
- To make builds faster on the controller :: No.
- To disable the web page :: No.
- To remove credentials :: No.
> Builds on the controller risk stability and secrets.

Q: What is a label for?
+ Letting a job ask for a kind of node instead of a named one
- Naming a build number :: No.
- Tagging a Git commit :: No.
- Encrypting secrets :: No.
> Labels decouple jobs from specific machines.
```

```cards
Controller :: The Jenkins server that schedules builds and stores configuration
Agent :: A machine or container that runs build steps for the controller
Executor :: A slot on a node that runs one build at a time
Label :: A tag used to choose which nodes can run a job
JENKINS_HOME :: The directory that holds all Jenkins state
```
