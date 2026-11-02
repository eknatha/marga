---
title: Managed Kubernetes: EKS and AKS
minutes: 16
summary: Create and operate managed Kubernetes on AWS and Azure, connect workloads to cloud identity, expose them through load balancers, and plan upgrades and node groups.
---

Running your own control plane is real work. EKS and AKS take over the API server, etcd and scheduler, so you manage worker nodes and workloads. The skill is knowing where the provider's responsibility ends and what you must still configure well: identity, networking, upgrades and cost.

## What you will learn

- What the provider manages and what you manage
- Creating a cluster and connecting `kubectl`
- Workload identity: giving Pods cloud permissions without keys
- Load balancers, node pools and upgrades

## Shared responsibility

| Area | Provider | You |
|------|----------|-----|
| Control plane availability and patching | Yes | |
| etcd backups | Yes | |
| Worker node OS patching | Optional (managed node groups, auto-upgrade) | Choose and enable |
| Kubernetes version upgrades | Provides versions | Plan and run them |
| Pod security, RBAC, network policy | | Yes |
| Application deployment and scaling | | Yes |

Managed does not mean hands-off. Versions go out of support, and an unsupported control plane is eventually upgraded for you, on the provider's schedule.

## Creating and connecting

```console
$ eksctl create cluster --name shop-prod --region eu-west-1 --version 1.31 --nodegroup-name general --node-type m6i.large --nodes 3 --nodes-min 3 --nodes-max 8 --managed
$ aws eks update-kubeconfig --name shop-prod --region eu-west-1
$ kubectl get nodes -o wide
$ az aks create --resource-group rg-shop --name shop-prod --node-count 3 --enable-managed-identity --enable-oidc-issuer --enable-workload-identity --network-plugin azure
$ az aks get-credentials --resource-group rg-shop --name shop-prod
$ kubectl get nodes
```

For production, define clusters in Terraform rather than one-off commands, so they are reviewed, repeatable and reproducible.

## Workload identity

A Pod that needs S3, a queue or a key vault should not carry access keys. Both clouds can map a Kubernetes **service account** to a cloud identity, so the Pod receives short-lived credentials automatically.

On EKS this is **IAM Roles for Service Accounts** (or EKS Pod Identity); on AKS it is **Workload Identity**.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-worker
  namespace: shop
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/shop-orders-worker
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-worker
  namespace: shop
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders-worker
  template:
    metadata:
      labels:
        app: orders-worker
    spec:
      serviceAccountName: orders-worker
      containers:
        - name: worker
          image: registry.example.com/shop/orders-worker:2.1.0
```

The IAM role's trust policy allows only that exact service account in that exact cluster. Scope each role to what one application needs. Granting node-level permissions instead gives every Pod on the node the same access, which is far too broad.

## Exposure and networking

A Service of type `LoadBalancer` makes the cloud create a load balancer. An Ingress controller (the AWS Load Balancer Controller, or the Application Gateway or NGINX ingress on Azure) shares one load balancer across many hosts.

```console
$ kubectl get svc -n ingress-nginx
$ kubectl get ingress -A
$ kubectl describe svc shop-api -n shop | grep -iE "loadbalancer|events" -A3
```

With cloud-native CNIs (AWS VPC CNI, Azure CNI) every Pod uses a real address from the subnet, so a large cluster can exhaust a small subnet. Plan CIDR ranges before creation. Use private clusters or restrict the API endpoint to trusted networks, and use security groups or NSGs and network policies for traffic control.

## Nodes and upgrades

Use **managed node groups** (EKS) or **node pools** (AKS) with several instance types and zones. Keep system and user workloads in separate pools, use spot or low-priority capacity only for interruption-tolerant work, and attach a cluster autoscaler or Karpenter.

```console
$ eksctl upgrade cluster --name shop-prod --version 1.31 --approve
$ eksctl upgrade nodegroup --name general --cluster shop-prod --kubernetes-version 1.31
$ az aks get-upgrades --resource-group rg-shop --name shop-prod -o table
$ az aks upgrade --resource-group rg-shop --name shop-prod --kubernetes-version 1.31.2
```

Upgrade one minor version at a time, staging first. Check deprecated API usage before upgrading.

## Incident: the Pod that could read every bucket

> **Incident:** A security review finds that a small internal tool, running on the cluster, can list and read every S3 bucket in the account. It uses no access keys. A penetration tester shows that anyone who gets a shell in any Pod can read customer exports.

The Pods inherited the **node instance profile**, which had broad S3 access to support an old batch job.

```console
$ kubectl exec deploy/internal-tool -n tools -- aws sts get-caller-identity
$ kubectl exec deploy/internal-tool -n tools -- env | grep -E "AWS_ROLE_ARN|AWS_WEB_IDENTITY"
```

No web identity variables means the Pod falls back to the node's role. Fix it by giving each workload its own service account and role, reducing the node role to the minimum the kubelet needs, and blocking Pod access to the instance metadata service (set the hop limit to 1 and require IMDSv2). Verify with `sts get-caller-identity` from a test Pod.

## Common mistakes

- Putting broad permissions on the node role
- Choosing a small subnet and running out of Pod addresses
- Public API endpoint open to the world
- Ignoring Kubernetes version support deadlines
- Treating the cluster as a pet created by hand instead of code

```quiz
Q: What does a managed Kubernetes service run for you?
- Your application pods
+ The control plane, including the API server and etcd
- Your CI pipeline
- Your RBAC rules
> You remain responsible for workloads, identity and node configuration.

Q: What is the purpose of IRSA or Workload Identity?
- Faster image pulls
+ Give Pods their own short-lived cloud credentials mapped to a service account
- Encrypt etcd
- Create nodes
> No access keys are stored, and permissions are scoped per workload.

Q: Why plan subnet sizes for VPC-native CNIs?
- Subnets cannot be changed
+ Each Pod consumes a real address, so a small subnet limits cluster size
- DNS requires it
- Load balancers need it
> Address exhaustion prevents new Pods from starting.

Q: How should you upgrade a managed cluster?
- Skip versions to save time
+ One minor version at a time, testing in staging first
- Only upgrade nodes
- Never upgrade
> Control plane first, then node groups, with deprecation checks.
```

```cards
Who patches the EKS or AKS control plane? :: The cloud provider
What maps a Pod to a cloud identity? :: IRSA or Pod Identity on EKS, Workload Identity on AKS
Why separate system and user node pools? :: To protect critical components from noisy workloads and to size pools independently
Why enforce IMDSv2 and hop limit 1? :: To stop Pods from using the node's instance credentials
```
