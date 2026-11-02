---
title: Testing, benchmarks and tooling
minutes: 12
summary: Write table-driven tests, measure coverage, benchmark hot paths and use the toolchain checks in CI.
---

Go has testing built in: a file ending in _test.go, a function starting with Test, and the go test command. There is no framework to choose or install. Combined with the race detector, benchmarks and vet, you get a solid safety net with very little setup, which is why Go projects are easy to contribute to and safe to change.

## What you will learn

- Write table-driven unit tests with subtests
- Use test helpers, temporary directories and fakes
- Measure coverage and write benchmarks
- Run vet, race and linters in CI

## A first test

Tests live next to the code in `_test.go` files.

```go
// parse.go
func ParseSize(s string) (int64, error) { /* ... */ }

// parse_test.go
func TestParseSize(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    int64
		wantErr bool
	}{
		{"bytes", "512", 512, false},
		{"kilobytes", "2K", 2048, false},
		{"empty", "", 0, true},
		{"junk", "12Q", 0, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ParseSize(tc.in)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Errorf("got %d, want %d", got, tc.want)
			}
		})
	}
}
```

The **table-driven** style makes adding a case one line and gives each case a name in the output.

## Helpers and temporary files

`t.TempDir()` gives a directory that is cleaned up after the test. `t.Helper()` marks a function as a helper so failures point at the caller. `t.Cleanup(fn)` registers cleanup. Use `httptest.NewServer` to start a fake HTTP server for client code, and `httptest.NewRecorder` to test handlers without a network. Combine with the fakes from the interfaces lesson. Keep tests deterministic: inject the clock and random sources instead of calling `time.Now` deep inside logic.

## Coverage and benchmarks

```bash
go test ./... -cover
go test ./... -coverprofile=cover.out
go tool cover -html=cover.out
```

Coverage shows what was executed, not whether it was checked well; use it to find untested branches, not as a target for its own sake. Benchmarks measure speed:

```go
func BenchmarkParseSize(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, _ = ParseSize("512M")
	}
}
```

```bash
go test -bench=. -benchmem
```

Read `ns/op` and `allocs/op`, and compare before and after a change; the `benchstat` tool helps with noise. Measure first, then optimise.

## Tooling in CI

A reasonable pipeline for a Go service:

```bash
gofmt -l . | tee /dev/stderr | (! read)   # fail if anything is unformatted
go vet ./...
go test -race -cover ./...
go build ./...
govulncheck ./...                         # known vulnerabilities in dependencies and code
```

Add a linter such as golangci-lint if the team wants more rules. Cache the module and build directories between runs to keep the pipeline fast. Pin the Go version in `go.mod` so developers and CI use the same toolchain.

```predict
Q: A test passes locally and fails in CI only sometimes. What are two likely causes in Go code?
???
A data race (run with -race) or a test that depends on time, ordering or shared state.
> Make tests deterministic and use the race detector.
```

## Incident: The 100 percent coverage that missed the bug

> **Incident:** A report parser had full coverage and still sent wrong numbers to finance.

```console
$ go test ./report -cover
ok  	example.com/ops/report	0.012s	coverage: 100.0% of statements
$ go test ./report -run TestMonth -v
--- PASS: TestMonth (0.00s)
$ # month 12 is parsed as 0
```

Tests executed every line but only with a single month value that happened to work. The team replaced the example test with a table covering every month and boundary values, and added a rule that new parsing code needs edge cases (empty, minimum, maximum, invalid). They stopped using the coverage percentage as a goal and use it to find unexecuted branches.

## Common mistakes

- Tests that depend on the network or the clock
- Chasing coverage numbers
- Not using subtests, so failures lack names
- Skipping the race detector

```quiz
Q: What is a table-driven test?
+ A list of cases run in a loop with subtests
- A test that uses a database table :: Unrelated.
- A benchmark :: Different.
- A test that sleeps :: Unrelated.
> Adding a case is one line.

Q: What does t.TempDir() provide?
+ A temporary directory removed after the test
- A shared global directory :: It is per test.
- A network share :: It is local.
- A database :: It is not.
> Tests should clean up; the lesson section explains why.

Q: What does go test -bench=. measure?
+ Speed and allocations of benchmark functions
- Code coverage :: Use -cover.
- Syntax errors :: Use build or vet.
- Race conditions :: Use -race.
> Measure before optimising.

Q: Which command finds known vulnerabilities in dependencies?
+ govulncheck
- gofmt :: Formats code.
- go doc :: Shows docs.
- go fmt :: Formats code.
> Run it in CI; the lesson section explains why.
```

```cards
Run tests :: go test ./...
Races :: go test -race ./...
Coverage :: go test -cover / -coverprofile
Benchmark :: go test -bench=. -benchmem
Vulnerabilities :: govulncheck ./...
Temp files :: t.TempDir()
```
