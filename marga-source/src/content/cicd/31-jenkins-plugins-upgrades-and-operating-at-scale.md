---
title: Jenkins: plugins, upgrades and operating at scale
minutes: 13
summary: Manage plugins and upgrades safely, configure Jenkins as code, and scale with agents, backups and monitoring.
---

A Jenkins server that has run for years is often a pile of hand-made settings and dozens of plugins. Operating it well means being able to recreate it, upgrade it without fear and notice problems before the users do.

## What you will learn

- Choosing the LTS line and managing plugins
- Configuration as Code for the controller
- Backups, restores and a safe upgrade routine
- Metrics that show a Jenkins in trouble

## Plugins are dependencies

Each plugin is code that runs inside the controller. Keep a list in a file with pinned versions, install only what you need and read the update notes. Prefer the **LTS** (long-term support) line for the core, which changes slowly and gets security fixes.

```text
# plugins.txt
workflow-aggregator:600.vb_57cce
git:5.2.2
kubernetes:4203.v1dc
configuration-as-code:1810.v9b_c30
credentials-binding:687.v619
```

## Configuration as Code

The Configuration as Code plugin reads a YAML file and sets up the controller to match: security realm, agents, credentials references and global settings. A rebuilt controller then comes up the same every time.

```yaml
jenkins:
  systemMessage: "Managed by code. Change it in the repository."
  numExecutors: 0
  securityRealm:
    local:
      allowsSignup: false
unclassified:
  location:
    url: https://ci.example.com/
```

```diagram
title: A safe upgrade routine
node: plan | Read release notes | 0 | 0 | Check the LTS changelog and plugin compatibility. | Skipping notes hides breaking changes.
node: copy | Test instance | 1 | 0 | Start a copy from backup with the new versions. | Testing in production is how Friday outages happen.
node: verify | Run sample jobs | 2 | 0 | Build key pipelines and check agents, credentials and plugins. | An empty test misses real breakage. | observe
node: back | Fresh backup | 1 | 1 | Back up JENKINS_HOME and keep the previous version available. | An untested backup is a hope, not a plan. | store
node: roll | Upgrade production | 2 | 1 | Upgrade in a quiet window and watch metrics. | No rollback plan turns a bad upgrade into an outage.
edge: plan | copy
edge: copy | verify
edge: verify | back
edge: back | roll
```

## Watching Jenkins

Measure queue length and time in queue, executor utilisation, build duration, disk use of `JENKINS_HOME` and JVM memory and garbage collection. A growing queue with idle agents points to labels or connection problems. A full disk or heap is the usual cause of a controller that slows down and then stops.

## Incident: The plugin upgrade that stopped the controller

> **Incident:** A batch plugin update left the controller failing at startup because two plugins disagreed about a shared library.

```console
$ journalctl -u jenkins -n 4
SEVERE: Failed Loading plugin workflow-cps v3999
java.lang.NoSuchMethodError: hudson.model.Run.getParent()
Jenkins stopped
```

They restored the plugin directory from the night before, upgraded plugins one group at a time in a test instance and added a written upgrade and rollback routine.

## Common mistakes

- Upgrading everything at once on a Friday
- Installing plugins nobody owns
- Keeping backups that were never restored
- Configuring the controller only by clicking in the UI

```quiz
Q: What is the LTS line?
+ A slower-moving release line with security fixes
- A development branch :: No.
- A kind of agent :: No.
- A plugin type :: No.
> LTS suits production controllers.

Q: What does Configuration as Code give you?
+ A controller you can recreate from a file
- Faster builds :: No.
- Free plugins :: No.
- No need for backups :: No.
> Setup is described in version-controlled YAML.

Q: Why test an upgrade on a copy first?
+ To find incompatibilities before production
- To save disk :: No.
- To avoid backups :: No.
- To skip release notes :: No.
> A copy shows breakage safely.

Q: A long queue with idle agents suggests what?
+ Label or connection problems
- Too many tests :: No.
- A broken database :: No.
- A full inbox :: No.
> Jobs cannot match an available agent.
```

```cards
LTS :: Long-term support release line of Jenkins
Configuration as Code :: A plugin that configures Jenkins from YAML
Plugin :: Add-on code that extends the controller
Queue time :: How long a build waits before it starts
Rollback plan :: Steps to return to the last working version
```
