# OpenAI Kubernetes control plane overload, December 2024
company: OpenAI
date: 11 December 2024
modules: kubernetes, observability, sre
calc: capacity, retries
source: OpenAI status page post-mortem for the 11 December 2024 incident | https://status.openai.com/
summary: A new telemetry service made heavy calls to the Kubernetes API in every cluster, the control plane failed, and DNS based service discovery stopped working.

## Before you read on
You add a monitoring agent to every cluster. How much load does it put on the control plane, and what depends on the control plane being up?

## The system
OpenAI ran its services on many Kubernetes clusters. A new telemetry service was deployed to collect more detailed metrics. Service discovery inside the clusters depended on cluster DNS, which is itself fed by the control plane.

## Timeline as reported
- A new telemetry service was rolled out, and its configuration made each node call the Kubernetes API for details, in a way that generated expensive requests.
- As reported, in large clusters this overloaded the API servers. The rollout reached the clusters before the effects were visible, because the problem grew gradually.
- With the control plane down or slow, engineers could not easily fix the problem, since the tools they use depend on that same API.
- The data plane was initially fine. DNS caches then expired and service discovery depended on the control plane, so services began to fail to find each other.
- Engineers scaled the control plane and removed the telemetry service, then recovered clusters one by one. Impact lasted several hours.

## Root cause
A change that was tested in a way that did not show the load in large clusters, and a design in which the data plane depended on the control plane through DNS.

## What changed
- OpenAI said it would improve staged rollouts with monitoring of the control plane, and require tests that show effects at scale.
- It also said it would add ways to get access to the control plane in an emergency, and decouple the data plane from the control plane.

## Lessons learned
- Test new cluster-wide components at production scale, and watch API server load during the rollout.
- Make the data plane keep working when the control plane is down, including service discovery.
- Keep an emergency path to fix the control plane, such as a break-glass access that does not depend on it.
- Roll out to the smallest cluster first and wait long enough for slow-growing problems to appear.

## Trade-offs to weigh
- **Rich telemetry against load.** More detail helps diagnosis and costs CPU and API calls.
- **DNS caching against freshness.** Longer caches ride out a short failure. They also delay changes.
- **Staged rollout against speed.** Staged rollouts show effects only if you watch the right signals.

## Try the calculators
In the capacity calculator, see how request load from many nodes adds up against the capacity of a control plane. In the retries calculator, see how clients that retry make an overloaded server worse.
