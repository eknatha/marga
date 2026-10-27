---
title: Interfaces and packages
minutes: 13
summary: Use small interfaces to decouple code and make it testable, and organise a project into packages with clear boundaries.
---

A tool that calls the real cloud API on every test is slow, flaky and expensive. The usual remedy is to depend on a small behaviour, not on a concrete client, and to substitute a fake in tests. Go does this with interfaces, which are satisfied implicitly: a type implements an interface just by having the methods. Together with a sensible package layout, this keeps programs easy to test and change.

## What you will learn

- Define and satisfy interfaces implicitly
- Accept interfaces, return concrete types
- Test with small fakes instead of real services
- Package layout, visibility and avoiding import cycles

## Implicit interfaces

An interface is a set of method signatures. Any type with those methods satisfies it; there is no `implements` keyword.

```go
type Notifier interface {
	Send(msg string) error
}

type Slack struct{ URL string }

func (s Slack) Send(msg string) error {
	// post to the webhook
	return nil
}

func alert(n Notifier, msg string) error {
	return n.Send("ALERT: " + msg)
}
```

`alert` works with Slack, email, a pager service or a test fake, without knowing which. Keep interfaces small, often one or two methods, such as `io.Reader` and `io.Writer` from the standard library. The wider an interface, the harder it is to fake and to satisfy.

## Accept interfaces, return structs

A common guideline: functions **accept** the smallest interface they need and **return** concrete types. Define the interface where it is used (in the consumer package), not next to the implementation. That way the consumer owns the contract and the provider needs no knowledge of its callers. Do not create an interface for every struct "just in case"; add one when you have two implementations or when a test needs a fake.

## Test with a fake

```go
type fakeNotifier struct{ sent []string }

func (f *fakeNotifier) Send(msg string) error {
	f.sent = append(f.sent, msg)
	return nil
}

func TestAlertPrefix(t *testing.T) {
	f := &fakeNotifier{}
	if err := alert(f, "disk full"); err != nil {
		t.Fatal(err)
	}
	if got := f.sent[0]; got != "ALERT: disk full" {
		t.Errorf("got %q", got)
	}
}
```

The test needs no network and runs in microseconds. For richer behaviour, the fake can return a configured error to check how your code handles failure, which is hard to provoke against a real service. The empty interface (`any`) accepts everything and checks nothing at compile time; use it sparingly.

## Packages

A package is a directory; all files in it share a name and a namespace. A typical layout for a tool:

```text
diskcheck/
  go.mod
  main.go            package main: parses flags, wires things together
  internal/
    probe/           package probe: reads disk usage
    report/          package report: formats results
```

Names starting with a capital letter are exported. The `internal` directory can only be imported by code inside the parent module, which keeps private code private. Go forbids **import cycles**, so if two packages need each other, pull the shared piece into a third package or reverse a dependency with an interface. Keep `main` thin: it reads configuration and calls into packages that are easy to test.

```predict
Q: Your function calls a cloud client directly and tests fail whenever the network is down. What change fixes this?
???
Define a small interface for the behaviour you need, accept it as a parameter, and pass a fake in tests.
> Depend on behaviour, not on a concrete service.
```

## Incident: The tests that called the real API

> **Incident:** A pipeline failed three times a week with timeouts, and no code had changed.

```console
--- FAIL: TestListInstances (30.00s)
    inventory_test.go:21: Get "https://ec2.eu-west-1.amazonaws.com/": context deadline exceeded
FAIL	example.com/ops/inventory	30.019s
```

The inventory package created a real cloud client inside its functions, so tests depended on credentials and network. The team introduced a one-method interface, Lister, passed it into the functions, and wrote a fake for tests. Unit tests now run in milliseconds and never touch the network; a small separate integration test, run nightly, checks the real API.

## Common mistakes

- Creating an interface for every type
- Making interfaces large
- Importing concrete clients deep inside business logic
- Circular dependencies between packages

```quiz
Q: How does a Go type satisfy an interface?
+ By having all the methods, with no explicit declaration
- By using the implements keyword :: Go has none.
- By embedding the interface in the file name :: Not related.
- By registering at runtime :: It is compile-time.
> Implicit satisfaction; the lesson section explains why.

Q: Where should an interface usually be defined?
+ In the package that uses it
- Next to every implementation :: That couples providers to callers.
- In main only :: Not required.
- In go.mod :: Not a place for code.
> The consumer owns the contract.

Q: Why use a fake in unit tests?
+ To avoid the network and to provoke specific results and errors
- To make code compile faster :: Not the purpose.
- To avoid writing tests :: Not the purpose.
- To hide errors :: Not the purpose.
> Faster and more reliable.

Q: What does the internal directory do?
+ Limits imports to code inside the parent module
- Encrypts the package :: It does not.
- Makes code run faster :: It does not.
- Publishes the package :: It does the opposite.
> A compiler-enforced boundary.
```

```cards
Interface satisfied by :: having the methods
Keep interfaces :: small
Define interface :: where it is used
Test double :: a small fake struct
Private code :: internal/ directory
No cycles :: extract a shared package
```
