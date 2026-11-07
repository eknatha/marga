---
title: VM networking: masquerade, bridge and Multus
minutes: 13
summary: Connect VMs to the pod network with masquerade, attach them to VLANs with bridge and Multus secondary networks, and expose them with Services.
---

Networking is where VMs differ most from containers. Guests expect network interfaces, MAC addresses and often fixed IPs. KubeVirt maps those wishes onto Kubernetes networking.

## What you will learn

- The pod network and masquerade binding
- Secondary networks with Multus and bridge
- Exposing a VM with Services
- Live migration and addresses

## The pod network

Every VM can attach to the default pod network. With **masquerade** binding, the guest gets a private address and KubeVirt NATs traffic to the pod's IP. Pods and Services can then reach the VM, and the VM reaches the cluster and the internet. Masquerade also supports live migration, because the guest keeps its private address while the pod address changes. The older `bridge` binding on the pod network is limited and not recommended.

```yaml
      networks:
        - name: default
          pod: {}
        - name: vlan100
          multus:
            networkName: vlan100-bridge
      domain:
        devices:
          interfaces:
            - name: default
              masquerade: {}
            - name: vlan100
              bridge: {}
```

## Secondary networks

A `NetworkAttachmentDefinition` describes an extra network, for example a Linux bridge connected to VLAN 100 on the node. Multus creates the second interface. With `bridge` binding the guest sees a real L2 network and can keep its own IP or get DHCP from the VLAN. Migration across nodes then needs the same bridge and VLAN on every node.

```diagram
title: One VM on two networks
node: guest | Guest OS | 1 | 1 | Sees two NICs, eth0 and eth1. | Wrong interface names in cloud-init break first boot. | service
node: pod | Pod network (masquerade) | 0 | 0 | NATed address, reachable by Services and pods. | The guest IP is private, so inbound needs a Service. | edge
node: vlan | VLAN 100 bridge | 0 | 2 | Real L2 network with its own addresses. | The bridge must exist on every node for migration. | edge
node: svc | Service / Ingress | 2 | 0 | Exposes VM ports to the cluster or outside. | A selector must match the VMI labels. | edge
node: phys | Physical network | 2 | 2 | Carries the VLAN to the data centre. | A missing trunk port blocks all VLAN traffic. | external
edge: pod | guest
edge: vlan | guest
edge: svc | pod
edge: vlan | phys
```

## Services and ports

`virtctl expose vm web01 --port=80 --name=web01-svc` creates a Service that selects the VMI. Network policies apply to the pod network but not to a Multus secondary interface, so secondary networks need their own controls.

## Incident: The VLAN that only worked on one node

> **Incident:** A VM reached its VLAN, but after a migration it lost the network.

```console
$ kubectl get vmi web01 -o wide
NAME    PHASE     NODENAME
web01   Running   node3
$ ssh node3 'ip link show br100'
Device "br100" does not exist.
```

Only two of six nodes had the br100 bridge that the NetworkAttachmentDefinition named. The VM migrated to node3, which had no bridge, and lost its VLAN. The bridge was added to every node by the node configuration tool.

## Common mistakes

- Using pod-network bridge binding instead of masquerade
- Forgetting the secondary bridge must exist on all nodes
- Expecting NetworkPolicy to cover Multus interfaces
- Hard-coding guest IPs on the pod network

```quiz
Q: Which binding is recommended for the pod network?
+ masquerade
- bridge :: No.
- sriov only :: No.
- none :: No.
> Masquerade NATs behind the pod IP.

Q: What creates a secondary VM interface?
+ Multus with a NetworkAttachmentDefinition
- A Deployment :: No.
- A ConfigMap :: No.
- A Namespace :: No.
> Multus attaches extra networks.

Q: Why must a VLAN bridge exist on every node?
+ A VM can migrate to any node
- DNS needs it :: No.
- Pods cannot start :: No.
- It speeds CPU :: No.
> The migrated VM needs the same network.

Q: How do pods reach a VM port?
+ Through a Service
- Only through SSH :: No.
- Only through the node IP :: No.
- They cannot :: No.
> A Service selects the VMI.
```

```cards
Masquerade :: A binding that NATs guest traffic behind the pod IP
Multus :: A CNI that attaches multiple networks to a pod
NetworkAttachmentDefinition :: A resource that describes an extra network
Bridge binding :: Connects the guest to a layer 2 bridge
Secondary network :: An additional interface beyond the pod network
```
