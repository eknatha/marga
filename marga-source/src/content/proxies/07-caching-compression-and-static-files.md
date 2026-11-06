---
title: Caching, compression and static files
minutes: 12
summary: Serve static files efficiently, cache upstream responses with correct keys and expiry, and compress safely at the proxy.
---

The fastest request is one the backend never sees. A well-configured proxy cache can absorb most traffic for public content. A badly configured one leaks private pages. The difference is the cache key and the rules for what may be stored.

## What you will learn

- Serving static files with the right headers
- proxy_cache: key, validity, stale and locking
- What must never be cached
- Compression and its limits

## Static files

```nginx
location /assets/ {
    root /var/www/shop;
    sendfile on;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

Give assets a content hash in the file name (`app.3f9c1.js`) so they can be cached for a long time and replaced by changing the name, not by purging.

## Caching upstream responses

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api:50m max_size=2g inactive=60m;
location /catalog/ {
    proxy_cache api;
    proxy_cache_key "$scheme$host$request_uri";
    proxy_cache_valid 200 301 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating;
    proxy_cache_lock on;
    add_header X-Cache-Status $upstream_cache_status;
}
```

The **key** decides what counts as the same request. `proxy_cache_lock` makes concurrent requests for a missing item wait for one backend fetch, avoiding a stampede. `use_stale` serves an old copy while the backend is failing, which turns an outage into a slow patch. The header shows HIT, MISS, EXPIRED or STALE for debugging.

## What not to cache

Anything personalised (cookies, authorisation headers, account pages) must bypass the cache or vary the key by user. nginx does not cache responses with `Set-Cookie` or `Cache-Control: private` by default; leave those protections on.

```diagram
title: A cached request
node: user | User | 0 | 0 | Asks for a public catalogue page. | A personalised page cached here leaks one user's data.
node: cache | Proxy cache | 1 | 0 | Answers HIT from disk, or MISS and asks the backend. | A key that ignores a header or cookie mixes up different users. | cache
node: app | Backend | 2 | 0 | Builds the page only on a MISS. | Without cache lock, a popular expiry sends a stampede here.
node: stale | Stale copy | 1 | 1 | Served if the backend is slow or down. | Stale content can mislead; keep the window short. | store
node: gz | Compression | 2 | 1 | Shrinks text responses before sending. | Compressing already-compressed files wastes CPU.
edge: user | cache
edge: cache | app
edge: cache | stale
edge: cache | gz
```

## Compression

`gzip on; gzip_types text/css application/json application/javascript;` shrinks text by 70 percent or more. Do not compress images or video, which are already compressed, and keep levels modest (4 to 6): higher levels cost CPU for little gain.

## Incident: Everyone saw the same name

> **Incident:** A cached page that showed a user's name was served to others.

```console
$ curl -s -H 'Cookie: sid=bob' https://shop.example.com/home | grep Hello
Hello Alice
X-Cache-Status: HIT
```

The cache key was only the URL. The team bypassed the cache when a session cookie was present, moved the personal part of the page to a separate uncached request and added a test that fetches the page as two users.

## Common mistakes

- A cache key that ignores user-specific headers
- Long cache lifetimes on files with no content hash
- Caching error responses for too long
- Compressing images and archives

```quiz
Q: What decides whether two requests are the same in a cache?
+ The cache key
- The file name only :: No.
- The TLS version :: No.
- The client IP only :: No.
> The key defines identity.

Q: What does proxy_cache_lock help prevent?
+ A stampede of identical backend fetches
- TLS failures :: No.
- DNS loops :: No.
- Disk errors :: No.
> One request fills the cache while others wait.

Q: What should not be cached by default?
+ Personalised responses
- Public images :: No.
- Fonts :: No.
- CSS :: No.
> Cookies and authorisation mean private content.

Q: What does X-Cache-Status HIT mean?
+ The proxy answered from its cache
- The backend answered :: No.
- The request failed :: No.
- The key was missing :: No.
> HIT is a cache answer.
```

```cards
Cache key :: The value that defines which requests share a cached response
Stale :: An expired cached copy served during an error or update
Cache stampede :: Many requests rebuilding the same item at once
Immutable :: A cache hint that a file will never change
gzip :: A common compression format for text responses
```
