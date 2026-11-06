## What does a reverse proxy do and why use one?
level: junior
A reverse proxy sits in front of one or more servers and accepts client requests on their behalf. It can terminate TLS, balance load, cache responses, compress, add security headers and hide the internal topology. Clients see one address while the proxy chooses a backend.

## What is the difference between a 502 and a 504?
level: junior
A 502 Bad Gateway means the proxy got an invalid response or could not connect to the upstream, for example connection refused. A 504 Gateway Timeout means the upstream did not answer in time. The error log text tells which: connect() failed versus upstream timed out.

## How does a load balancer decide where to send a request?
level: mid
By an algorithm such as round robin, least connections, or consistent hashing on a key like client address or a cookie, combined with health checks that remove failing servers. Round robin suits similar requests; least connections suits uneven request times; hashing gives stickiness.

## Why is retrying at the proxy risky?
level: mid
A timeout does not prove the request failed, so a retried POST can run twice. Retries also add load to a backend that is already slow. Retry only idempotent methods, limit attempts, add a budget for retries, and use idempotency keys in the API.

## How do you reload proxy configuration without dropping connections?
level: senior
Test the new configuration first (nginx -t), then send a reload signal. The master starts new workers with the new configuration while old workers finish their current connections and then exit. For larger changes use blue-green backends or weighted routing and drain connections before removing a server.

## Walk through debugging a sudden rise in 504 errors.
level: senior
Read the error log to confirm upstream timeouts, then check backend latency and saturation (CPU, database, connection pools). Compare timing in the access log between proxy and upstream. Look for a recent change or a retry storm. Reduce load with rate limits or by turning off retries, fix the slow dependency, and only then tune timeouts.
