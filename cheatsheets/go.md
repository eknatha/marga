---
title: Go
summary: Toolchain commands, types, errors, interfaces, goroutines, context, HTTP, testing and build flags for services and CLIs.
module: go
---

## Toolchain

```bash
go version
go mod init example.com/shop
go mod tidy
go build ./...
go run ./cmd/api
go test ./... -race -cover
go vet ./...
gofmt -l .
go install ./cmd/api
```

> **Warning:** Commit `go.mod` and `go.sum`. Without `go.sum`, builds cannot verify that dependencies are unchanged.

## Types, slices and maps

```go
type Order struct {
    ID    string
    Items []Item
    Tags  map[string]string
}

names := make([]string, 0, 8)
names = append(names, "a")
m := map[string]int{"a": 1}
if v, ok := m["b"]; !ok { _ = v }
```

> **Warning:** Writing to a nil map panics. Create maps with `make` or a literal. Reading from a nil map is safe.

## Errors and defer

```go
f, err := os.Open(path)
if err != nil {
    return fmt.Errorf("open config %q: %w", path, err)
}
defer f.Close()

if errors.Is(err, os.ErrNotExist) { /* handle */ }
var pe *fs.PathError
if errors.As(err, &pe) { /* inspect */ }
```

> **Warning:** `defer` in a loop runs when the function returns, not each iteration. Move the body into a function to release resources early.

## Interfaces

```go
type Store interface {
    Get(ctx context.Context, id string) (Order, error)
}

func NewService(s Store) *Service { return &Service{store: s} }
```

Accept interfaces, return concrete types. Keep interfaces small and define them where they are used.

## Goroutines and channels

```go
var wg sync.WaitGroup
results := make(chan int, len(jobs))
for _, j := range jobs {
    wg.Add(1)
    go func() {
        defer wg.Done()
        results <- work(j)
    }()
}
wg.Wait()
close(results)
```

> **Warning:** A goroutine that blocks forever on a channel is a leak. Always have a way to stop it: close the channel or cancel a context.

## Context

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
select {
case <-ctx.Done():
    return ctx.Err()
case r := <-ch:
    _ = r
}
```

Pass `ctx` as the first parameter. Never store it in a struct.

## HTTP service

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
})
srv := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}
go srv.ListenAndServe()
// on shutdown signal:
srv.Shutdown(ctx)
```

> **Warning:** `http.ListenAndServe` and the default client have no timeouts. Set them explicitly, or slow peers can hold connections forever.

## Testing

```go
func TestSum(t *testing.T) {
    cases := []struct{ name string; a, b, want int }{
        {"zero", 0, 0, 0}, {"pos", 1, 2, 3},
    }
    for _, c := range cases {
        t.Run(c.name, func(t *testing.T) {
            if got := Sum(c.a, c.b); got != c.want { t.Fatalf("got %d want %d", got, c.want) }
        })
    }
}
```

```bash
go test -run TestSum -v ./pkg/...
go test -bench . -benchmem
go test -race ./...
```

## Build for containers

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o app ./cmd/api
```

```dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /app /app
USER 65532:65532
ENTRYPOINT ["/app"]
```

> **Warning:** Pin the Go version in `go.mod` and in the build image, so local and CI builds use the same toolchain.

## Debugging

```bash
go test -race ./...
go tool pprof -http=:0 http://localhost:6060/debug/pprof/profile
curl -s localhost:6060/debug/pprof/goroutine?debug=1 | head -30
GODEBUG=gctrace=1 ./app
```

> **Warning:** Never expose the pprof endpoint on a public port. Bind it to localhost or an internal network.
