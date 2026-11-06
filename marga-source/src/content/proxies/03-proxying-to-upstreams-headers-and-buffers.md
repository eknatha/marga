---
title: Proxying to upstreams: headers, buffers and WebSockets
minutes: 13
summary: Forward requests to backends with proxy_pass, pass the right headers, understand buffering and support WebSockets correctly.
---

A proxy that simply passes bytes along is not enough. Applications use the Host header, the client address and the scheme to build links, set cookies and log users. Getting these headers right, and understanding buffering, prevents a long list of confusing bugs.

## What you will learn

- proxy_pass and how paths are rewritten
- Headers the backend needs
- Buffering, streaming and large uploads
- Proxying WebSockets and server-sent events

## proxy_pass and the trailing slash

```nginx
location /api/ {
    proxy_pass http://app_backend;          # sends /api/users as /api/users
}
location /v1/ {
    proxy_pass http://app_backend/;         # sends /v1/users as /users (prefix replaced)
}
```

With no URI after the host, the original path is sent. With a URI (even just `/`), the matched prefix is replaced. One character changes what the backend receives.

## Headers

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

The app should trust these headers only when the request comes from the proxy's address. Otherwise anyone can claim to be any client by sending the header.

## Buffering

By default nginx reads the whole response from the backend into buffers and then sends it at the client's pace, which frees the backend quickly. For streaming responses and server-sent events turn it off with `proxy_buffering off;`. Large uploads are limited by `client_max_body_size` (default 1 MB), which returns 413 when exceeded.

## WebSockets

```nginx
map $http_upgrade $connection_upgrade { default upgrade; '' close; }
location /ws/ {
    proxy_pass http://app_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 3600s;
}
```

```diagram
title: What the proxy tells the backend
node: client | Client | 0 | 0 | Sends Host, cookies and its own address. | The client can also forge headers such as X-Forwarded-For.
node: proxy | nginx | 1 | 0 | Rewrites the request and sets trusted forwarding headers. | If it forgets Host, the app builds wrong links.
node: app | Backend app | 2 | 0 | Reads Host, scheme and client address from headers. | Trusting headers from anyone but the proxy is a spoofing hole. | service
node: ws | WebSocket | 2 | 1 | A long-lived upgraded connection through the same proxy. | Default timeouts close idle sockets after 60 seconds.
edge: client | proxy
edge: proxy | app
edge: proxy | ws
```

## Incident: Redirects to localhost

> **Incident:** After moving behind nginx a login redirected users to http://localhost:3000/dashboard.

```console
$ curl -sI https://shop.example.com/login
HTTP/1.1 302 Found
Location: http://localhost:3000/dashboard
```

The app built the absolute URL from the Host and scheme it received, which were the proxy's connection to localhost. Passing Host and X-Forwarded-Proto and telling the app to trust the proxy fixed the redirect.

## Common mistakes

- Changing proxy_pass without noticing the trailing-slash rule
- Leaving the default 1 MB upload limit on an upload endpoint
- Forgetting WebSocket upgrade headers and timeouts
- Letting any client send X-Forwarded-For that the app trusts

```quiz
Q: What does a URI in proxy_pass (even /) do?
+ Replaces the matched location prefix
- Adds TLS :: No.
- Nothing :: No.
- Disables buffering :: No.
> The path sent upstream changes.

Q: Which header carries the original scheme?
+ X-Forwarded-Proto
- Content-Type :: No.
- Accept :: No.
- ETag :: No.
> The app needs it to build https links.

Q: Why turn proxy_buffering off for some responses?
+ For streaming and server-sent events
- To save CPU :: No.
- To enable TLS :: No.
- To compress files :: No.
> Buffering delays streamed data.

Q: What status appears when an upload exceeds client_max_body_size?
+ 413
- 404 :: No.
- 502 :: No.
- 301 :: No.
> 413 means payload too large.
```

```cards
proxy_pass :: nginx directive that sends a request to a backend
proxy_set_header :: Sets a header on the request to the backend
Buffering :: Holding a response in memory before sending it on
Upgrade header :: Asks to switch the connection to another protocol such as WebSocket
client_max_body_size :: The largest request body nginx accepts
```
