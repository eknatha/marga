---
title: Envoy, Traefik and Caddy: dynamic proxies
minutes: 13
summary: Compare proxies that configure themselves from service discovery: Envoy listeners, routes and clusters, Traefik providers and Caddy automatic HTTPS.
---

In containers and Kubernetes, backends appear and disappear all day. Static files and reloads work, but several proxies were built to follow the platform instead. They differ in complexity, features and who they suit.

## What you will learn

- Envoy: listeners, routes, clusters and endpoints
- Traefik: entrypoints, routers, services and providers
- Caddy: automatic HTTPS and a short config
- How to choose between nginx, HAProxy, Envoy, Traefik and Caddy

## Envoy

Envoy is a high-performance proxy with rich observability, used as the data plane in many service meshes and gateways. Its model: a **listener** accepts connections, **filters** (such as the HTTP connection manager) process them, **routes** map requests to a **cluster**, and a cluster holds **endpoints**. The control plane sends updates over **xDS** APIs, so routes and endpoints change live.

```yaml
static_resources:
  listeners:
  - name: main
    address: { socket_address: { address: 0.0.0.0, port_value: 8080 } }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress
          route_config:
            virtual_hosts:
            - name: all
              domains: ["*"]
              routes:
              - match: { prefix: "/api" }
                route: { cluster: api }
          http_filters:
          - name: envoy.filters.http.router
            typed_config: { "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router }
```

## Traefik

Traefik discovers services from **providers** (Docker labels, Kubernetes Ingress or IngressRoute, files). An **entrypoint** is a port, a **router** matches rules (`Host(...)`, `PathPrefix(...)`), and a **service** lists the servers. Middleware adds rate limits, auth and redirects.

```yaml
labels:
  - "traefik.http.routers.shop.rule=Host(`shop.example.com`)"
  - "traefik.http.routers.shop.tls.certresolver=letsencrypt"
  - "traefik.http.services.shop.loadbalancer.server.port=8080"
```

## Caddy

Caddy obtains and renews HTTPS certificates by default and its config is short:

```text
shop.example.com {
    reverse_proxy 10.0.1.11:8080 10.0.1.12:8080
    encode gzip
}
```

## Choosing

nginx: very common, great for web serving and caching. HAProxy: excellent load balancing and live state. Envoy: service meshes, gRPC, deep metrics. Traefik: containers and Kubernetes with automatic discovery. Caddy: small deployments and simple HTTPS.

```diagram
title: A dynamic proxy follows the platform
node: plat | Platform | 0 | 0 | Containers or pods start and stop; labels or resources describe them. | Wrong labels mean a service is invisible to the proxy.
node: disc | Discovery | 1 | 0 | The provider or xDS control plane watches for changes. | A control plane outage freezes routes at the last known state.
node: proxy | Proxy | 2 | 0 | Updates routes live without a reload. | A bad update can send traffic nowhere; validate before applying.
node: svc | Services | 3 | 0 | Receive traffic as soon as they are ready. | Routing before readiness gives errors during a rollout.
node: obs | Metrics and access logs | 2 | 1 | Show routes, latency and errors per service. | Without them, a dynamic proxy is a black box. | observe
edge: plat | disc
edge: disc | proxy
edge: proxy | svc
edge: proxy | obs
```

## Incident: The route nobody could see

> **Incident:** A new service never received traffic because its label had a typo.

```console
$ curl -s -o /dev/null -w '%{http_code}\n' https://new.example.com
404
traefik dashboard: no router matches host new.example.com
label: traefik.http.routers.neww.rule  (typo: neww)
```

The label mentioned a router name that did not match the service definition, so no route existed. The team added a dashboard check to the deploy pipeline and a smoke test that requests the new host.

## Common mistakes

- Applying dynamic configuration with no validation or smoke test
- Exposing the proxy dashboard or admin API publicly
- Using Envoy for a simple site where nginx or Caddy is enough
- Not monitoring the control plane that feeds the proxy

```quiz
Q: What is xDS in Envoy?
+ APIs that deliver configuration updates live
- A certificate type :: No.
- A load test :: No.
- A log format :: No.
> The control plane uses xDS.

Q: Which proxy gets certificates automatically by default?
+ Caddy
- A bare TCP forwarder :: No.
- A hub :: No.
- A modem :: No.
> Caddy handles HTTPS automatically.

Q: What does a Traefik provider do?
+ Discovers services from a platform
- Encrypts logs :: No.
- Stores images :: No.
- Signs code :: No.
> Providers feed routes.

Q: What is a good way to check a dynamic route after deploy?
+ A smoke test requesting the new host
- Hope :: No.
- Reboot the proxy :: No.
- Delete the labels :: No.
> A test proves the route works.
```

```cards
xDS :: Envoy's set of APIs for dynamic configuration
Cluster :: In Envoy, a group of endpoints
Provider :: In Traefik, a source of service information
Entrypoint :: In Traefik, a port the proxy listens on
Middleware :: Reusable request processing such as rate limits
```
