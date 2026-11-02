---
title: Why Go for operations, and your first program
minutes: 12
summary: See why so much infrastructure software is written in Go, set up a module, build a single static binary and use the standard tools.
---

Docker, Kubernetes, Terraform, Prometheus and many other tools you use every day are written in Go. When you read their code, write an operator, or build a small internal tool that must run on any server without installing a runtime, Go is the natural choice. It is a small language with fast builds, built-in concurrency and one standard way to format, test and build code, which makes it easy to pick up for someone who already scripts in Bash or Python.

## What you will learn

- Why Go suits operations tools
- Create a module and run, build and cross-compile a program
- Use gofmt, go vet and go mod as part of the normal workflow
- Read a small Go program: packages, imports, main

## Why operations teams like Go

Go compiles to a **single static binary** with no interpreter or shared libraries to install, so you can copy one file to a server or put it into an almost empty container image. Compilation is fast, the standard library already includes an HTTP server and client, JSON, testing, and crypto, and goroutines make it practical to handle many connections or checks at once. The language is deliberately small, so code written by different people looks alike. The price is verbosity (explicit error handling) and a less expressive type system than some languages. For glue scripts of ten lines, Bash or Python is still faster to write; Go pays off for tools that others will run, long-running services and anything that must be fast and dependable.

## A module and a first program

A Go project is a **module**, described by a `go.mod` file. Code lives in packages, and an executable has a `main` package with a `main` function.

```bash
mkdir diskcheck && cd diskcheck
go mod init example.com/ops/diskcheck
```

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	host, err := os.Hostname()
	if err != nil {
		fmt.Fprintln(os.Stderr, "cannot read hostname:", err)
		os.Exit(1)
	}
	fmt.Printf("checking %s\n", host)
}
```

```bash
go run .                 # compile and run
go build -o diskcheck .  # produce a binary
./diskcheck
```

Notice the pattern: a function returns a value and an `error`, and the caller checks it right away. You will see it everywhere in Go.

## Build for any platform

Cross-compiling needs two environment variables and no extra tools:

```bash
GOOS=linux GOARCH=amd64 go build -o diskcheck-linux-amd64 .
GOOS=linux GOARCH=arm64 go build -o diskcheck-linux-arm64 .
GOOS=darwin GOARCH=arm64 go build -o diskcheck-mac .
file diskcheck-linux-amd64
```

From a laptop you can produce binaries for the servers you manage. Set `CGO_ENABLED=0` when you want a fully static binary that does not depend on the C library, for example for a minimal container image. Check the result with `ldd`, which should say "not a dynamic executable".

## The standard toolbox

Go ships with its tools, so teams rarely argue about style or setup:

- `gofmt -l .` lists files that are not formatted; `gofmt -w .` fixes them. Most editors do it on save.
- `go vet ./...` finds suspicious code, such as a wrong format string.
- `go test ./...` runs tests in every package.
- `go mod tidy` adds missing and removes unused dependencies in `go.mod`.
- `go doc fmt.Printf` shows documentation in the terminal.

Dependencies are fetched by version from module proxies and recorded with checksums in `go.sum`, so builds are reproducible. Commit both `go.mod` and `go.sum`. You can practise small exercises in the browser on the Go playground page of this site before installing anything.

```predict
Q: You need to give a teammate a tool that runs on their Linux servers without installing anything. Why is Go a good fit?
???
It builds a single static binary, so you copy one file and run it, with no runtime to install.
> Static, self-contained binaries are the main operational advantage.
```

## Incident: The tool that needed Python 3.11

> **Incident:** An internal inventory script worked on laptops and failed on half the servers.

```console
$ ./inventory.py
Traceback (most recent call last):
  File "./inventory.py", line 3, in <module>
    import tomllib
ModuleNotFoundError: No module named 'tomllib'
$ python3 --version
Python 3.8.10
```

The script needed a newer interpreter than the older servers had. The team rewrote the tool in Go, built one binary per architecture with GOOS and GOARCH, and shipped it through the artifact store. Nothing needs to be installed on the servers, and the same binary is used in CI and in the container image.

## Common mistakes

- Forgetting to run go mod init so imports fail
- Ignoring the error return value
- Building on a laptop with CGO enabled and then running on a different C library
- Not committing go.sum

```quiz
Q: What does a Go build produce for a normal command-line tool?
+ A single compiled binary
- A bundle that needs a runtime :: Go needs no runtime.
- A Python script :: Go compiles.
- A Docker image :: That is a separate step.
> One file to ship; the lesson section explains why.

Q: Which file describes a Go module and its dependencies?
+ go.mod
- main.go :: That holds code.
- go.sum only :: That holds checksums.
- Makefile :: Not part of Go itself.
> Commit go.mod and go.sum.

Q: How do you build a Linux arm64 binary on a Mac?
+ Set GOOS=linux and GOARCH=arm64 and run go build
- Install a Linux VM first :: Not needed.
- Run go install only :: That installs to the local machine.
- It is not possible :: Cross-compiling is built in.
> Cross-compilation needs only two variables.

Q: Which command lists files that are not formatted?
+ gofmt -l .
- go mod tidy :: It changes dependencies.
- go run . :: It runs the program.
- go doc :: It shows documentation.
> Formatting is standard in Go.
```

```cards
Start a module :: go mod init NAME
Run :: go run .
Build binary :: go build -o NAME .
Cross-compile :: GOOS=linux GOARCH=arm64 go build
Static binary :: CGO_ENABLED=0
Format :: gofmt -w . and go vet ./...
```
