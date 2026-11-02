---
title: HTTP services, clients and JSON
minutes: 13
summary: Build a small HTTP service with handlers, middleware, health endpoints and JSON, and call other services safely.
---

Much operations work is an API: a webhook receiver, a metrics exporter, a small internal service that Kubernetes probes and other teams call. The Go standard library is enough to build these without a framework. This lesson shows the shape of a clean service: routing, JSON in and out, a health endpoint, a bit of middleware, and a client that behaves well.

## What you will learn

- Write handlers and route requests with http.ServeMux
- Encode and decode JSON with struct tags and validation
- Add middleware for logging and recovery
- Expose health endpoints and call other services with a tuned client

## Handlers and routing

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "ok")
})
mux.HandleFunc("GET /hosts/{name}", getHost)
mux.HandleFunc("POST /hosts", createHost)
```

Since Go 1.22 the standard router understands methods and path variables like `{name}`, read with `r.PathValue("name")`. A handler receives the response writer and the request, and you set headers and status before writing the body. Return an appropriate code: 400 for bad input, 404 for missing, 500 for your own bugs.

## JSON in and out

```go
type Host struct {
	Name string `json:"name"`
	Port int    `json:"port"`
}

func createHost(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var h Host
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&h); err != nil {
		http.Error(w, "bad json: "+err.Error(), http.StatusBadRequest)
		return
	}
	if h.Name == "" || h.Port < 1 || h.Port > 65535 {
		http.Error(w, "name and a valid port are required", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(h)
}
```

Limit the body size, reject unknown fields if your API is strict, and validate the values, because decoding only checks the shape. Struct tags name the fields; `omitempty` skips empty ones.

## Middleware

Middleware wraps a handler to add behaviour such as logging or panic recovery.

```go
func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

srv := &http.Server{Addr: ":8080", Handler: logging(mux)}
```

Chain them for recovery, request IDs, authentication and metrics. Use structured logging (`log/slog`) so fields such as the request ID can be searched.

## Health endpoints and clients

Expose two endpoints: **liveness** (`/healthz`, the process is not stuck) and **readiness** (`/readyz`, it can take traffic: database reachable, caches warm). Kubernetes probes use them. Keep liveness cheap and do not make it depend on the database, or a database blip will restart every pod.

For outbound calls, reuse one `http.Client` (it pools connections), set `Timeout`, always close `resp.Body`, check the status code, and retry only idempotent requests with backoff and a limit. Never build a new client per request; it leaks connections and sockets.

```predict
Q: Liveness probes call the database. The database restarts for one minute. What happens to your pods?
???
They fail liveness and are restarted, turning a short database blip into an outage. Keep liveness independent and use readiness for dependencies.
> Probes encode what a failure means.
```

## Incident: A fresh client for each request

> **Incident:** A collector service slowly ran out of sockets and began failing with connection errors.

```console
dial tcp 10.2.4.7:443: connect: cannot assign requested address
$ ss -tan | grep -c TIME-WAIT
61204
$ grep -n "http.Client{" collector/*.go
collector/fetch.go:31:	c := &http.Client{}
```

Each fetch created a new client with its own transport, so connections were never reused and thousands sat in TIME-WAIT. The team created one shared client with a timeout and a tuned transport, closed response bodies in all code paths, and added a metric for open connections. Socket use dropped by 99 percent.

## Common mistakes

- No body size limit on requests
- Skipping validation after decoding
- Creating a client per request
- Liveness probes that check dependencies

```quiz
Q: What does a JSON struct tag do?
+ Controls the field name used when encoding and decoding
- Makes the field private :: Capitalisation does that.
- Encrypts the field :: It does not.
- Adds a database index :: It does not.
> Tags are metadata; the lesson section explains why.

Q: Why limit the request body?
+ To protect memory from huge or malicious requests
- To speed up JSON :: Not the aim.
- Because Go requires it :: It does not.
- To encode data :: It does not.
> Use MaxBytesReader; the lesson section explains why.

Q: What is readiness for?
+ Telling the orchestrator whether the service can take traffic now
- Telling it to restart the pod :: That is liveness.
- Logging requests :: Not its purpose.
- Compressing responses :: Not its purpose.
> Liveness means alive, readiness means ready.

Q: How should you use http.Client?
+ Create one, reuse it, and set a timeout
- Create one per request :: That leaks connections.
- Use no timeout :: Requests can hang.
- Never close bodies :: That leaks connections.
> Connection pooling needs reuse.
```

```cards
Route :: mux.HandleFunc("GET /path/{id}", h)
Decode :: json.NewDecoder(r.Body).Decode(&v)
Limit :: http.MaxBytesReader
Middleware :: func(http.Handler) http.Handler
Probes :: /healthz live, /readyz ready
Client :: one shared client with Timeout
```
