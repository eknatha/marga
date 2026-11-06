---
title: nginx configuration: servers and locations
minutes: 13
summary: Read and write nginx configuration: contexts, server blocks, location matching rules and how to test and reload safely.
---

nginx configuration looks simple and hides a few rules that cause most mistakes. Once you know how a server is chosen and how locations are matched, you can read any nginx file and predict what it does.

## What you will learn

- Contexts and directives in nginx.conf
- How server and server_name are chosen
- Location matching order
- Testing and reloading safely

## Contexts

```nginx
events { worker_connections 1024; }
http {
  include mime.types;
  server {
    listen 80;
    server_name shop.example.com;
    root /var/www/shop;

    location / { try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:8080; }
    location = /healthz { return 200 "ok\n"; }
    location ~* \.(png|jpg|css|js)$ { expires 7d; }
  }
}
```

`events` and `http` are top-level contexts. `server` lives in `http`, `location` in `server`. A directive set in an outer context is inherited unless an inner block sets it again.

## Choosing the server

nginx matches the `listen` address and port first, then compares the request's `Host` header with `server_name`. If nothing matches it uses the default server for that port (the first one, or the one marked `default_server`). A catch-all default that returns 444 or 404 stops unknown hostnames from reaching a real site.

## Location matching

| Form | Meaning | Priority |
|---|---|---|
| `location = /x` | Exact match | Highest, stops searching |
| `location ^~ /x` | Prefix, skip regexes | Stops regex checks |
| `location ~ re` / `~* re` | Regex (case sensitive or not) | Checked in file order |
| `location /x` | Prefix | Longest prefix remembered, lowest |

nginx finds the longest matching prefix, then checks regexes in order, and a matching regex wins over a plain prefix. That is why a broad image regex can capture `/api/photo.png`.

```diagram
title: How nginx picks where a request goes
node: req | Request | 0 | 0 | Arrives with an address, port, Host header and path. | A missing Host header falls back to the default server.
node: srv | Server block | 1 | 0 | Chosen by listen and server_name. | No default_server means the first block answers unknown hosts.
node: loc | Location | 2 | 0 | Exact, then prefix, then regex rules choose a location. | A broad regex can steal paths from a prefix.
node: act | Action | 3 | 0 | Serve a file, proxy_pass, return or redirect. | A wrong proxy_pass trailing slash rewrites the path.
node: test | nginx -t | 1 | 1 | Checks the syntax before reload. | Reloading without a test can take the site down. | observe
edge: req | srv
edge: srv | loc
edge: loc | act
edge: test | srv
```

## Test, then reload

`nginx -t` reports syntax and file errors. `nginx -s reload` starts new workers with the new configuration and lets old ones finish their requests, so no connection is dropped. If the test fails, the old configuration keeps running.

## Incident: The regex that stole the API

> **Incident:** A new image location used a regex that also matched paths under /api/.

```console
$ nginx -t
nginx: configuration file /etc/nginx/nginx.conf test is successful
$ curl -sI https://shop.example.com/api/photo.png | head -1
HTTP/1.1 404 Not Found
```

The syntax was valid, so the test passed. The request matched the regex location before the /api/ prefix, and was served from disk. Adding ^~ to the API location stopped regex matching for that prefix.

## Common mistakes

- Assuming the first location in the file wins
- Reloading without running nginx -t
- Having no default server for unknown hosts
- Repeating the same directive in every block instead of using inheritance

```quiz
Q: Which location form is checked first and stops the search?
+ Exact match with =
- A case-insensitive regex :: No.
- A plain prefix :: No.
- A catch-all :: No.
> Exact matches have the highest priority.

Q: What does ^~ do?
+ Stops regex matching after a prefix match
- Makes a regex case sensitive :: No.
- Redirects :: No.
- Disables the location :: No.
> It protects a prefix from regexes.

Q: What does nginx -t do?
+ Checks the configuration without applying it
- Reloads workers :: No.
- Shows logs :: No.
- Restarts the server :: No.
> It tests syntax and referenced files.

Q: What chooses the server block?
+ listen address and server_name
- The file name :: No.
- The user agent :: No.
- The TLS version :: No.
> Port and Host header decide.
```

```cards
server block :: Configuration for one virtual host
location :: A rule that matches the request path
server_name :: The hostnames a server block answers for
nginx -s reload :: Applies new configuration without dropping connections
default_server :: The block used when no server_name matches
```
