# Cloudflare Workers KV outage, June 2025
company: Cloudflare
date: 12 June 2025
modules: cloud, sre, observability
calc: redundancy, cells
source: Cloudflare blog: Cloudflare service outage June 12, 2025 | https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/
summary: A third-party cloud storage failure took out the storage layer behind a key-value service, and many Cloudflare products that depended on it failed together.

## Before you read on
Your platform uses a third-party service for part of its storage. Do your customers know that, and what happens to every product that depends on it when it fails?

## The system
Workers KV is a global key-value store used by many Cloudflare products: access control, authentication, image and stream services, and others. Its storage backend used a mix of Cloudflare infrastructure and a third-party cloud provider.

## Timeline as reported
- On 12 June, a major cloud provider had its own outage (see the Google Cloud incident of the same day), and the storage backend used by Workers KV was affected.
- As reported, a large share of requests to Workers KV failed, because the data in the affected storage could not be read, and the cache could not help for cold keys.
- Products that depended on the key-value store, including Access, WARP, Gateway, and some dashboard features, had errors or increased latency.
- Engineers worked on moving the storage to another provider, and, as the third-party service recovered, traffic returned.
- The incident lasted about two and a half hours, with the largest impact in the first hour.

## Root cause
A hidden dependency on a single third-party storage backend, shared by many products, so one external failure became a failure of many internal services.

## What changed
- Cloudflare said it would move Workers KV storage to its own object storage so as to cut the external dependency.
- It also said it would add safeguards to progressively recover and restore services after a storage failure, and review dependencies of its products.

## Lessons learned
- Map the dependencies of every product, including the external ones, and note which are single points of failure.
- Avoid giving many unrelated products a single shared storage layer.
- Make each product degrade in a defined way when the key-value store is unavailable.
- Practise recovery after a storage failure, with a controlled return of traffic.

## Trade-offs to weigh
- **Buying storage against building it.** Buying is fast. Building removes a dependency and costs a lot of work.
- **Shared service against separate stores.** A shared store is efficient. A failure reaches every product.
- **Caching against cold data.** Caches hide short failures and do nothing for keys that were not read lately.

## Try the calculators
In the redundancy calculator, see how availability improves with a second independent backend, and how it does not when both share a provider. In the cells calculator, see how separate stores reduce the share of products hit.
