# Ingress NGINX admission controller vulnerabilities, March 2025
company: Kubernetes project and security researchers
date: March 2025
modules: kubernetes, networking, devsecops
calc: redundancy
source: Kubernetes blog post about CVE-2025-1974 | https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/
summary: A set of vulnerabilities in the Ingress NGINX controller let an attacker who could reach its admission webhook run code and read secrets across the cluster.

## Before you read on
A component that routes web traffic into your cluster also validates configuration through a webhook. How reachable is that webhook, and what can the controller read?

## The system
The Ingress NGINX controller turns Ingress objects into NGINX configuration. It includes an admission controller that checks new objects, which is served over the pod network. The controller commonly has permission to read secrets in the cluster.

## Timeline as reported
- In March 2025 researchers reported a set of vulnerabilities in the controller, one of them rated critical.
- The admission webhook was reachable without authentication from the pod network, and it passed attacker-controlled data into NGINX configuration testing.
- An attacker could inject configuration to run code in the controller pod.
- Because the controller could read secrets, this could lead to taking over the cluster.
- The Kubernetes project released fixed versions and advised upgrading and, as a temporary step, disabling the validating webhook.
- Teams were told to check whether the webhook was exposed outside the cluster network.

## Root cause
Unauthenticated access to a powerful internal service, a configuration parser that handled untrusted input, and a controller with broad permissions.

## What changed
- The project released patched versions of the controller.
- It advised restricting access to the admission webhook to the API server and upgrading as soon as possible.
- Users were advised to review the permissions granted to the controller.

## Lessons learned
- Limit network access to admission webhooks to the API server only.
- Give controllers only the secrets and namespaces they need.
- Keep controllers patched and watch security announcements for components in the traffic path.
- Use network policies to limit what pods can reach inside the cluster.

## Trade-offs to weigh
- **Flat pod network against segmentation.** A flat network is simple and lets any pod probe internal services.
- **Broad controller permissions against least privilege.** Broad rights make setup easy and increase the damage.
- **Quick patching against change risk.** Patching a critical component needs a rollout plan.

## Try the calculators
In the redundancy calculator, see why having several copies of a controller does not protect against a flaw they all share.
