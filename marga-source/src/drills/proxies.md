## 502 with connection refused
level: junior
Users see 502 right after a deploy.

```text
2026/11/06 00:14:02 [error] connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://10.0.2.14:8080/"
```
? What does this tell you?
+ Nothing is listening on the app port, so look at the app, not the proxy
- The proxy certificate has expired
- The cache is full
- The client is too slow
why: Connection refused is returned instantly when no process accepts the connection. Check the app containers and their startup logs.

## 504 on slow pages
level: junior
Some pages return 504 after exactly 60 seconds.

```text
upstream timed out (110: Connection timed out) while reading response header from upstream
proxy_read_timeout 60s;
```
? What is the most useful first step?
+ Find why the backend is slow for those requests before raising the timeout
- Set proxy_read_timeout to 3600 seconds
- Restart the proxy every hour
- Turn off logging
why: A timeout is a symptom of a slow backend. A bigger timer hides the problem and keeps connections tied up.

## Wrong client address in logs
level: mid
The application logs show 10.0.0.5 for every visitor.

```text
app log: client=10.0.0.5 GET /login
nginx: proxy_pass http://app;   # no forwarding headers set
```
? What fixes this correctly?
+ Send X-Forwarded-For from the proxy and make the app trust it only from the proxy address
- Open the app port to the internet
- Remove the proxy
- Switch the log format to JSON
why: The app sees the proxy as its peer. Forwarding headers carry the original address and must only be trusted from known proxies.

## Retries creating duplicate orders
level: mid
A payment endpoint is retried by the proxy.

```text
proxy_next_upstream error timeout http_502;
POST /orders  -> upstream 1 timeout -> retried on upstream 2
orders table: two rows for order 9912
```
? What should change?
+ Do not retry non-idempotent requests automatically, and add idempotency keys to the API
- Increase the number of retries
- Add more upstream servers
- Lower the log level
why: A timeout does not mean the request failed. Retrying a POST can repeat its effect unless the endpoint is idempotent.

## All backends marked down
level: senior
After a config change every backend is unhealthy.

```text
health check: GET /healthz expects 200
backend replies: 301 Moved Permanently (redirect to /healthz/)
upstream: no live upstreams while connecting to upstream
```
? What is the cause and fix?
+ The health check path redirects, so fix the path or accept the redirect, then confirm with a manual curl
- The backends are too fast
- TLS is disabled
- Compression is enabled
why: Health checks usually need an exact status. Test the check path from the proxy host and match what the backend really returns.

## Reload fails silently
level: senior
Someone edits the config and the site keeps serving old rules.

```text
$ nginx -s reload
nginx: [emerg] unknown directive "proxy_pas" in /etc/nginx/conf.d/app.conf:12
```
? What is the safe practice?
+ Always run nginx -t before reload and make the pipeline refuse a failing test
- Reload twice
- Delete the old config
- Run nginx as root
why: A failed test keeps the old configuration running, which is good, but nobody notices the change did not apply. Test in CI and alert on failed reloads.
