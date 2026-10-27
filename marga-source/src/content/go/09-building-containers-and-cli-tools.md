---
title: Building CLI tools and small container images
minutes: 13
summary: Ship Go programs well: a clear command-line interface, version information, multi-stage builds and tiny, safe container images.
---

You wrote the tool, and now other people must run it: on laptops, in pipelines and in containers. A clear command-line interface, a version flag that tells you which build is running, and a small image with no shell for an attacker are the finishing touches that make a Go tool operable. Go makes each of these unusually easy.

## What you will learn

- Parse flags and subcommands, and set exit codes
- Embed the version at build time with ldflags
- Write a multi-stage Dockerfile for a static binary
- Choose a base image: scratch, distroless or alpine

## A command-line tool

The standard `flag` package is enough for simple tools:

```go
func main() {
	addr := flag.String("addr", ":8080", "listen address")
	verbose := flag.Bool("v", false, "verbose logging")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println(version)
		return
	}
	// run the tool with *addr and *verbose
}
```

For tools with many subcommands (`tool get`, `tool apply`), libraries such as cobra are common. Whatever you use: print usage on `-h`, write results to standard output and diagnostics to standard error, and exit non-zero on failure so pipelines can react. Read secrets from environment variables or files, not from flags, because flags show in the process list.

## Embed the version

Put a variable in `main` and set it at build time:

```go
var version = "dev"
```

```bash
go build -ldflags "-s -w -X main.version=$(git describe --tags --always)" -o tool .
./tool -version
```

`-X` sets the string, and `-s -w` strips debug data to make the binary smaller. Every binary and container should report exactly what it is, which makes incident questions like "which build is running?" easy to answer. Go also records module and VCS information in the binary, readable with `go version -m ./tool`.

## A multi-stage image

Compile in a full Go image and copy only the binary into a minimal one:

```dockerfile
FROM golang:1.24 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-s -w" -o /out/tool .

FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/tool /tool
USER nonroot
ENTRYPOINT ["/tool"]
```

Copying `go.mod` and `go.sum` first lets the dependency download layer be cached when only code changes. The final image holds one static binary and nothing else, often under 15 MB, with no shell, no package manager and few vulnerabilities to scan. The image runs as a non-root user.

## Choosing the base

`scratch` is an empty image: smallest, but no CA certificates, time zone data or user accounts unless you copy them in. **Distroless** static images include certificates and a non-root user and nothing else, a good default. **Alpine** gives you a shell and package manager for debugging, at the cost of more surface and a different C library (not an issue for static Go builds). For debugging a distroless image in Kubernetes, use an ephemeral debug container instead of installing tools in production. Add a health check or rely on the orchestrator probes, and set resource limits, including `GOMEMLIMIT` so the Go runtime respects the container memory limit.

```predict
Q: Your Go container needs HTTPS calls but the image is `scratch` and certificate errors appear. What are two fixes?
???
Copy the CA certificates into the image, or use a distroless static base which already includes them.
> A bare image has no trust store.
```

## Incident: Which build is running?

> **Incident:** A bug fix did not seem to work, and nobody could say whether production had the new binary.

```console
$ kubectl exec deploy/billing -- /billing -version
OCI runtime exec failed: exec: "/billing": stat /billing: no such file or directory
$ kubectl get deploy billing -o jsonpath="{.spec.template.spec.containers[0].image}"
registry.example.com/billing:latest
```

The image used the latest tag and the binary had no version output, so nobody could confirm what ran. The team started tagging images with the commit hash, embedding the version with ldflags, exposing it at /version and in a metric, and recorded it in release notes. A debugging container showed the build info in seconds.

## Common mistakes

- Using latest tags
- Running as root in the container
- Putting secrets in command-line flags
- Forgetting CA certificates in scratch images

```quiz
Q: How do you embed a version string at build time?
+ With -ldflags "-X main.version=..."
- By editing the binary afterwards :: Not needed.
- By using go doc :: Not related.
- By adding a Dockerfile label only :: Labels do not appear in the binary.
> Set it from git describe.

Q: Why use a multi-stage build?
+ To ship only the binary in a small final image
- To compile faster :: Not the aim.
- To avoid tests :: Not the aim.
- To use more disk :: The opposite.
> Build tools stay behind; the lesson section explains why.

Q: What does CGO_ENABLED=0 give you?
+ A static binary with no dependency on the C library
- A faster CPU :: Not related.
- More logs :: Not related.
- A bigger image :: The opposite.
> Good for scratch and distroless.

Q: Where should secrets be passed to a CLI tool?
+ Through environment variables or files, not command-line flags
- Flags :: They appear in process lists.
- Source code :: Never commit secrets.
- Image tags :: Tags are public metadata.
> Flags are visible; the lesson section explains why.
```

```cards
Flags :: flag package or cobra
Version :: -ldflags "-X main.version=..."
Static build :: CGO_ENABLED=0
Image :: multi-stage, distroless, non-root
Memory :: set GOMEMLIMIT near the container limit
Report :: --version prints the exact build
```
