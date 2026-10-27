---
title: Types, structs, slices and maps
minutes: 13
summary: Use the core data types: zero values, slices, maps and structs with methods, and avoid the common slice and map surprises.
---

Most operations tools read data, shape it and print or send it: a list of hosts, a map of settings, a record for each disk. Go gives you a handful of simple building blocks for that. They have a few behaviours that surprise people coming from Python, such as zero values, slices that share memory, and maps that are not safe to use from several goroutines at once. Learn those and you avoid most early bugs.

## What you will learn

- Variables, constants and zero values
- Slices: length, capacity, append and copying
- Maps: lookup with the comma-ok form
- Structs and methods, including pointer receivers

## Variables and zero values

Declare with `var` or the short form `:=` inside functions. Every type has a **zero value** (0, "", false, nil), so a variable is never uninitialized.

```go
var count int            // 0
var name string          // ""
threshold := 0.85        // float64, inferred
const maxRetries = 3
```

Types are strict: an `int` and an `int64` cannot be mixed without conversion (`int64(count)`). Strings are immutable sequences of bytes, usually UTF-8, and `len(s)` counts bytes, not characters. Use `strings` and `strconv` from the standard library for most text work, for example `strconv.Atoi("42")` which returns a number and an error.

## Slices

A slice is a window onto an array, with a length and a capacity.

```go
hosts := []string{"web1", "web2"}
hosts = append(hosts, "web3")     // append may allocate a new array
for i, h := range hosts {
	fmt.Println(i, h)
}
firstTwo := hosts[:2]             // shares memory with hosts
safe := append([]string(nil), hosts...) // an independent copy
```

Two gotchas. First, a sub-slice shares the underlying array, so changing `firstTwo[0]` changes `hosts[0]`; copy when you need independence. Second, always assign the result of `append`, because the slice header you passed may be out of date. A nil slice is valid and behaves like an empty one in `len`, `range` and `append`.

## Maps

A map is a hash table with unordered keys.

```go
ports := map[string]int{"http": 80, "https": 443}
ports["ssh"] = 22

if p, ok := ports["smtp"]; ok {
	fmt.Println("smtp on", p)
} else {
	fmt.Println("smtp not configured")
}
delete(ports, "ssh")
```

Reading a missing key returns the zero value, so use the **comma-ok** form when "missing" and "zero" mean different things. Writing to a nil map panics, so create one with `make(map[string]int)` or a literal. Iteration order is random on purpose; sort the keys (package `sort` or `slices`) when you need stable output. A plain map is not safe for concurrent writes, which matters in the lesson on goroutines.

## Structs and methods

A struct groups fields; methods attach behaviour.

```go
type Disk struct {
	Mount   string
	UsedPct float64
}

func (d Disk) Full() bool { return d.UsedPct >= 90 }

func (d *Disk) Grow(p float64) { d.UsedPct += p }

d := Disk{Mount: "/var", UsedPct: 87}
d.Grow(5)
fmt.Println(d.Full())     // true
```

A **value receiver** works on a copy; a **pointer receiver** can change the original and avoids copying large structs. Mixing both on one type is confusing, so most types use pointer receivers if any method needs to modify state. Exported names start with a capital letter (`Mount`); lowercase names are private to the package. Struct tags such as `` `json:"mount"` `` control how encoding libraries name fields.

```predict
Q: You slice `hosts[:2]` and change the first element of the slice. What happens to `hosts`?
???
It changes too, because the sub-slice shares the same underlying array. Copy it if you need independence.
> Slices are windows, not copies.
```

## Incident: The map that panicked at startup

> **Incident:** A new service crashed on its first request with a panic.

```console
panic: assignment to entry in nil map

goroutine 18 [running]:
main.(*Registry).Add(...)
	/src/registry.go:22
main.handle({0xc0001a2000, 0x1c})
```

The Registry struct had a map field that was never created, because a struct's zero value leaves maps nil. Reading from a nil map is fine, so unit tests passed; the first write panicked. The fix was a constructor function that calls make, and a test that adds an entry. The team also added a lint rule for exported structs with map fields.

## Common mistakes

- Writing to a nil map
- Assuming a sub-slice is a copy
- Forgetting to assign the result of append
- Relying on map iteration order

```quiz
Q: What is the zero value of a string in Go?
+ The empty string
- nil :: Strings cannot be nil.
- null :: Go has no null.
- undefined :: Go has no undefined.
> Zero values make variables safe by default.

Q: Why use the comma-ok form with a map?
+ To tell a missing key from a stored zero value
- To speed up lookups :: It is about correctness.
- To lock the map :: It does not lock.
- To sort the keys :: It does not sort.
> v, ok := m[k]; the lesson section explains why.

Q: What happens when you write to a nil map?
+ The program panics
- The key is created :: Only for a made map.
- It returns an error :: Maps do not return errors.
- It is ignored :: It panics.
> Create maps with make or a literal.

Q: When do you need a pointer receiver on a method?
+ When the method must modify the value or the struct is large
- Whenever the method name is capitalised :: Unrelated.
- Never :: Sometimes needed.
- Only for slices :: Receivers apply to any type.
> Be consistent per type; the lesson section explains why.
```

```cards
Short declaration :: x := value (inside functions)
Zero values :: 0, "", false, nil
Append :: s = append(s, x)
Independent copy :: append([]T(nil), s...)
Safe map read :: v, ok := m[k]
Method that changes state :: func (d *T) Name()
```
