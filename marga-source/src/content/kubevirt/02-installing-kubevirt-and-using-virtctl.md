---
title: Installing KubeVirt and using virtctl
minutes: 12
summary: Install the KubeVirt operator and custom resource, check hardware virtualization or emulation, and use virtctl to start VMs and open consoles.
---

Getting KubeVirt running is quick. Getting it running well means choosing nodes with hardware virtualization and knowing which settings are only for testing.

## What you will learn

- Prerequisites and the hardware virtualization check
- Installing the operator and the KubeVirt resource
- Using virtctl day to day
- Emulation, feature gates and common install problems

## Prerequisites

Nodes need hardware virtualization (Intel VT-x or AMD-V) exposed as `/dev/kvm`. Bare-metal nodes have it. Cloud VMs have it only on instance types that allow nested virtualization. A container runtime that supports the KubeVirt device plugin and a CNI are also required.

```bash
# On a node: is hardware virtualization available?
ls -l /dev/kvm
grep -c -E 'vmx|svm' /proc/cpuinfo
```

## Install

```bash
export VERSION=$(curl -s https://storage.googleapis.com/kubevirt-prow/release/kubevirt/kubevirt/stable.txt)
kubectl apply -f "https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/kubevirt-operator.yaml"
kubectl apply -f "https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/kubevirt-cr.yaml"
kubectl -n kubevirt wait kv kubevirt --for condition=Available --timeout=10m
```

The operator manifest installs the controller and the CRD. The `KubeVirt` custom resource tells it to deploy virt-api, virt-controller and virt-handler. Pin the version in production instead of following `stable`.

```diagram
title: What the two manifests create
node: op | kubevirt-operator.yaml | 0 | 1 | Installs the operator Deployment, RBAC and the KubeVirt CRD. | Applying it alone deploys nothing else. | process
node: cr | KubeVirt resource | 1 | 1 | Declares the install, with settings and feature gates. | A wrong setting here affects every VM. | store
node: comps | virt-api, controller, handler | 2 | 0 | The operator deploys these components in the kubevirt namespace. | virt-handler pods only appear on schedulable nodes. | service
node: kvm | Nodes with /dev/kvm | 2 | 2 | Expose the kvm device through the device plugin. | Without it VMs fail to schedule or fall back to emulation. | edge
edge: op | cr
edge: cr | comps
edge: comps | kvm
```

## virtctl

```bash
virtctl start web01
virtctl console web01
virtctl vnc web01
virtctl ssh cloud-user@web01
virtctl stop web01
```

`virtctl` is a plugin-style client that adds the VM actions kubectl cannot do. It talks to virt-api for console and VNC streams.

## Emulation and feature gates

For a laptop test with no virtualization, patch the `KubeVirt` resource with `spec.configuration.developerConfiguration.useEmulation: true`. It is slow and unsupported for real work. Optional features are enabled by name under `developerConfiguration.featureGates`.

## Incident: Ten times slower than expected

> **Incident:** Every VM on a new cluster was very slow.

```console
$ kubectl -n kubevirt get kv kubevirt -o jsonpath='{.spec.configuration.developerConfiguration}'
{"useEmulation":true}
$ ls /dev/kvm
ls: cannot access '/dev/kvm': No such file or directory
```

Someone had enabled emulation to get past a failed scheduling error on nodes without nested virtualization. The cluster was rebuilt on instance types that expose hardware virtualization and emulation was turned off.

## Common mistakes

- Following the stable release URL in production
- Enabling emulation to silence a scheduling error
- Installing on nodes without hardware virtualization
- Skipping the wait for the KubeVirt resource to become Available

```quiz
Q: What does the KubeVirt custom resource do?
+ Tells the operator to deploy KubeVirt components
- Creates a VM disk :: No.
- Replaces the CNI :: No.
- Backs up VMs :: No.
> The operator acts on this resource.

Q: What file shows hardware virtualization on a node?
+ /dev/kvm
- /etc/hosts :: No.
- /var/log/kvm :: No.
- /proc/kube :: No.
> The kvm device exposes it.

Q: What is useEmulation for?
+ Testing without hardware virtualization
- Faster production VMs :: No.
- Live migration :: No.
- Backups :: No.
> It is slow and only for tests.

Q: What does virtctl console do?
+ Opens the serial console of a VM
- Deletes the VM :: No.
- Resizes a disk :: No.
- Installs the operator :: No.
> It connects through virt-api.
```

```cards
virtctl :: A command line tool for VM actions such as console and migrate
KubeVirt CR :: The resource that declares a KubeVirt installation
/dev/kvm :: The device that exposes hardware virtualization on a Linux node
Emulation :: Software CPU emulation used when no hardware virtualization exists
Feature gate :: A named switch that enables an optional feature
```
