## Hello, production
id: hello
task: Write greet(name string) string that returns "Hello, NAME!". main prints greet("SRE").
hint: Use fmt.Sprintf.
@@ start
package main

import "fmt"

func greet(name string) string {
	return ""
}

func main() {
	fmt.Println(greet("SRE"))
}
@@ sol
package main

import "fmt"

func greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	fmt.Println(greet("SRE"))
}
@@ expect
Hello, SRE!

## Sum a slice
id: sum
task: Write sum(nums []int) int and print the sum of 3, 5, 7 and 10.
hint: Loop with range and add each value to a total.
@@ start
package main

import "fmt"

func sum(nums []int) int {
	return 0
}

func main() {
	fmt.Println(sum([]int{3, 5, 7, 10}))
}
@@ sol
package main

import "fmt"

func sum(nums []int) int {
	total := 0
	for _, n := range nums {
		total += n
	}
	return total
}

func main() {
	fmt.Println(sum([]int{3, 5, 7, 10}))
}
@@ expect
25

## Return two values
id: divmod
task: Write divide(a, b int) (int, error). It returns a/b, or an error "divide by zero" when b is 0. Print the result of 10/2 and then the error for 1/0.
hint: Return errors.New(...) or fmt.Errorf(...) with a zero value.
@@ start
package main

import (
	"errors"
	"fmt"
)

var _ = errors.New

func divide(a, b int) (int, error) {
	return 0, nil
}

func main() {
	q, err := divide(10, 2)
	fmt.Println(q, err)
	_, err = divide(1, 0)
	fmt.Println(err)
}
@@ sol
package main

import (
	"errors"
	"fmt"
)

func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("divide by zero")
	}
	return a / b, nil
}

func main() {
	q, err := divide(10, 2)
	fmt.Println(q, err)
	_, err = divide(1, 0)
	fmt.Println(err)
}
@@ expect
5 <nil>
divide by zero

## Count words with a map
id: wordcount
task: Write count(words []string) map[string]int and print the counts for the words in main in sorted key order.
hint: m[w]++ works even when the key is missing. Sort the keys with sort.Strings.
@@ start
package main

import (
	"fmt"
	"sort"
)

func count(words []string) map[string]int {
	return nil
}

func main() {
	m := count([]string{"error", "info", "error", "warn", "error", "info"})
	keys := make([]string, 0)
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Println(k, m[k])
	}
}
@@ sol
package main

import (
	"fmt"
	"sort"
)

func count(words []string) map[string]int {
	m := map[string]int{}
	for _, w := range words {
		m[w]++
	}
	return m
}

func main() {
	m := count([]string{"error", "info", "error", "warn", "error", "info"})
	keys := make([]string, 0)
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Println(k, m[k])
	}
}
@@ expect
error 3
info 2
warn 1

## Struct and method
id: service
task: Define type Service with Name string and Replicas int. Give it a method Describe() string that returns "NAME runs R replicas". Print Describe for api with 3 replicas.
hint: A method looks like func (s Service) Describe() string.
@@ start
package main

import "fmt"

type Service struct {
}

func main() {
	s := Service{}
	fmt.Println(s)
}
@@ sol
package main

import "fmt"

type Service struct {
	Name     string
	Replicas int
}

func (s Service) Describe() string {
	return fmt.Sprintf("%s runs %d replicas", s.Name, s.Replicas)
}

func main() {
	s := Service{Name: "api", Replicas: 3}
	fmt.Println(s.Describe())
}
@@ expect
api runs 3 replicas

## Change a value with a pointer
id: pointer
task: Write scale(s *Service, n int) that sets s.Replicas to n. Scale web from 2 to 5 and print the result.
hint: A pointer receiver or pointer argument lets the function change the caller's value.
@@ start
package main

import "fmt"

type Service struct {
	Name     string
	Replicas int
}

func scale(s *Service, n int) {
}

func main() {
	web := Service{"web", 2}
	scale(&web, 5)
	fmt.Println(web.Name, web.Replicas)
}
@@ sol
package main

import "fmt"

type Service struct {
	Name     string
	Replicas int
}

func scale(s *Service, n int) {
	s.Replicas = n
}

func main() {
	web := Service{"web", 2}
	scale(&web, 5)
	fmt.Println(web.Name, web.Replicas)
}
@@ expect
web 5

## Filter a slice
id: filter
task: Write healthy(list []Host) []string that returns the names of hosts with Up true, in the same order.
hint: Start with an empty slice and append when h.Up is true.
@@ start
package main

import "fmt"

type Host struct {
	Name string
	Up   bool
}

func healthy(list []Host) []string {
	return nil
}

func main() {
	hosts := []Host{{"a", true}, {"b", false}, {"c", true}}
	fmt.Println(healthy(hosts))
}
@@ sol
package main

import "fmt"

type Host struct {
	Name string
	Up   bool
}

func healthy(list []Host) []string {
	var out []string
	for _, h := range list {
		if h.Up {
			out = append(out, h.Name)
		}
	}
	return out
}

func main() {
	hosts := []Host{{"a", true}, {"b", false}, {"c", true}}
	fmt.Println(healthy(hosts))
}
@@ expect
[a c]

## Interface for notifiers
id: iface
task: Define interface Notifier with Send(msg string) string. Implement it for Email and Pager (Email returns "email: MSG", Pager returns "page: MSG"). notifyAll sends one message through every notifier and prints each result.
hint: A type satisfies an interface just by having the methods.
@@ start
package main

import "fmt"

type Notifier interface {
}

type Email struct{}
type Pager struct{}

func notifyAll(list []Notifier, msg string) {
}

func main() {
	notifyAll([]Notifier{Email{}, Pager{}}, "disk full")
	fmt.Println("done")
}
@@ sol
package main

import "fmt"

type Notifier interface {
	Send(msg string) string
}

type Email struct{}
type Pager struct{}

func (Email) Send(msg string) string { return "email: " + msg }
func (Pager) Send(msg string) string { return "page: " + msg }

func notifyAll(list []Notifier, msg string) {
	for _, n := range list {
		fmt.Println(n.Send(msg))
	}
}

func main() {
	notifyAll([]Notifier{Email{}, Pager{}}, "disk full")
	fmt.Println("done")
}
@@ expect
email: disk full
page: disk full
done

## Custom error type
id: customerr
task: Define type HTTPError with Code int. Its Error() method returns "http error CODE". fetch(code int) error returns nil for 200 and an HTTPError otherwise. Print the error for 503 and then the word ok for 200.
hint: A type with an Error() string method is an error.
@@ start
package main

import "fmt"

type HTTPError struct {
}

func fetch(code int) error {
	return nil
}

func main() {
	if err := fetch(503); err != nil {
		fmt.Println(err)
	}
	if err := fetch(200); err == nil {
		fmt.Println("ok")
	}
}
@@ sol
package main

import "fmt"

type HTTPError struct {
	Code int
}

func (e HTTPError) Error() string { return fmt.Sprintf("http error %d", e.Code) }

func fetch(code int) error {
	if code == 200 {
		return nil
	}
	return HTTPError{Code: code}
}

func main() {
	if err := fetch(503); err != nil {
		fmt.Println(err)
	}
	if err := fetch(200); err == nil {
		fmt.Println("ok")
	}
}
@@ expect
http error 503
ok

## Wrap and unwrap errors
id: wrap
task: load() returns an error that wraps ErrNotFound with the text "load config". Use fmt.Errorf with %w. In main print the message, then print true if errors.Is(err, ErrNotFound).
hint: fmt.Errorf("load config: %w", ErrNotFound) keeps the original error inside.
@@ start
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func load() error {
	return nil
}

func main() {
	err := load()
	fmt.Println(err)
	fmt.Println(errors.Is(err, ErrNotFound))
}
@@ sol
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func load() error {
	return fmt.Errorf("load config: %w", ErrNotFound)
}

func main() {
	err := load()
	fmt.Println(err)
	fmt.Println(errors.Is(err, ErrNotFound))
}
@@ expect
load config: not found
true

## Defer cleanup
id: defer
task: Write run() that prints "open", defers a function that prints "close", then prints "work". The output must be open, work, close.
hint: defer runs when the surrounding function returns.
@@ start
package main

import "fmt"

func run() {
	fmt.Println("open")
	fmt.Println("work")
}

func main() {
	run()
}
@@ sol
package main

import "fmt"

func run() {
	fmt.Println("open")
	defer fmt.Println("close")
	fmt.Println("work")
}

func main() {
	run()
}
@@ expect
open
work
close

## Recover from a panic
id: recover
task: safeDiv(a, b int) (result int, err error) must not crash when b is 0. Use defer and recover to turn the panic into an error with the text "recovered".
hint: A deferred function can set the named result values after recover().
@@ start
package main

import "fmt"

func safeDiv(a, b int) (result int, err error) {
	return a / b, nil
}

func main() {
	fmt.Println(safeDiv(8, 2))
	fmt.Println(safeDiv(1, 0))
}
@@ sol
package main

import (
	"errors"
	"fmt"
)

func safeDiv(a, b int) (result int, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = errors.New("recovered")
		}
	}()
	return a / b, nil
}

func main() {
	fmt.Println(safeDiv(8, 2))
	fmt.Println(safeDiv(1, 0))
}
@@ expect
4 <nil>
0 recovered

## Run work in goroutines
id: goroutine
task: Start 3 goroutines. Each sends its number squared on a channel. Collect the three results, sort them and print them. Use a channel, not shared variables.
hint: Make a channel with make(chan int), start go func(n int){...}(i), then read 3 values.
@@ start
package main

import (
	"fmt"
	"sort"
)

func main() {
	results := []int{}
	sort.Ints(results)
	fmt.Println(results)
}
@@ sol
package main

import (
	"fmt"
	"sort"
)

func main() {
	ch := make(chan int)
	for i := 1; i <= 3; i++ {
		go func(n int) { ch <- n * n }(i)
	}
	results := []int{}
	for i := 0; i < 3; i++ {
		results = append(results, <-ch)
	}
	sort.Ints(results)
	fmt.Println(results)
}
@@ expect
[1 4 9]

## Wait with a WaitGroup
id: waitgroup
task: Run 5 goroutines that each add 1 to a shared counter protected by a sync.Mutex. Wait for all of them with a sync.WaitGroup and print the counter.
hint: Add before starting each goroutine, call Done in the goroutine, then Wait.
@@ start
package main

import "fmt"

func main() {
	counter := 0
	fmt.Println(counter)
}
@@ sol
package main

import (
	"fmt"
	"sync"
)

func main() {
	var wg sync.WaitGroup
	var mu sync.Mutex
	counter := 0
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			counter++
			mu.Unlock()
		}()
	}
	wg.Wait()
	fmt.Println(counter)
}
@@ expect
5

## A worker pool
id: pool
task: Start 3 workers that read numbers from a jobs channel and send number*10 on a results channel. Send the numbers 1 to 6, collect 6 results, sort them and print them.
hint: Close the jobs channel after sending, and have workers use for range.
@@ start
package main

import (
	"fmt"
	"sort"
)

func main() {
	var out []int
	sort.Ints(out)
	fmt.Println(out)
}
@@ sol
package main

import (
	"fmt"
	"sort"
)

func worker(jobs <-chan int, results chan<- int) {
	for j := range jobs {
		results <- j * 10
	}
}

func main() {
	jobs := make(chan int, 6)
	results := make(chan int, 6)
	for w := 0; w < 3; w++ {
		go worker(jobs, results)
	}
	for i := 1; i <= 6; i++ {
		jobs <- i
	}
	close(jobs)
	var out []int
	for i := 0; i < 6; i++ {
		out = append(out, <-results)
	}
	sort.Ints(out)
	fmt.Println(out)
}
@@ expect
[10 20 30 40 50 60]

## Stop on a timeout
id: timeout
task: slow() sleeps for 200 ms and then sends "done". Use select with time.After(50 * time.Millisecond) so main prints "timeout" instead of waiting.
hint: select waits for the first channel that is ready.
@@ start
package main

import (
	"fmt"
	"time"
)

func slow() <-chan string {
	ch := make(chan string, 1)
	go func() {
		time.Sleep(200 * time.Millisecond)
		ch <- "done"
	}()
	return ch
}

func main() {
	fmt.Println(<-slow())
}
@@ sol
package main

import (
	"fmt"
	"time"
)

func slow() <-chan string {
	ch := make(chan string, 1)
	go func() {
		time.Sleep(200 * time.Millisecond)
		ch <- "done"
	}()
	return ch
}

func main() {
	select {
	case v := <-slow():
		fmt.Println(v)
	case <-time.After(50 * time.Millisecond):
		fmt.Println("timeout")
	}
}
@@ expect
timeout

## Cancel with a context
id: context
task: Use context.WithTimeout of 50 ms. work(ctx) loops until ctx.Done() is closed and then returns ctx.Err(). Print the error.
hint: Create the context in main and pass it down. The error text is context deadline exceeded.
@@ start
package main

import (
	"context"
	"fmt"
)

func work(ctx context.Context) error {
	return nil
}

func main() {
	ctx := context.Background()
	fmt.Println(work(ctx))
}
@@ sol
package main

import (
	"context"
	"fmt"
	"time"
)

func work(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(10 * time.Millisecond):
		}
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	fmt.Println(work(ctx))
}
@@ expect
context deadline exceeded

## Parse JSON
id: jsonparse
task: Parse the JSON text into a slice of Item (fields Name string and Healthy bool, with json tags name and healthy). Print the names of the items that are not healthy.
hint: Struct tags look like `json:"name"`. Use json.Unmarshal([]byte(text), &items).
@@ start
package main

import "fmt"

type Item struct {
	Name    string
	Healthy bool
}

func main() {
	text := `[{"name":"web","healthy":true},{"name":"db","healthy":false},{"name":"cache","healthy":false}]`
	var items []Item
	_ = text
	for _, it := range items {
		if !it.Healthy {
			fmt.Println(it.Name)
		}
	}
}
@@ sol
package main

import (
	"encoding/json"
	"fmt"
)

type Item struct {
	Name    string `json:"name"`
	Healthy bool   `json:"healthy"`
}

func main() {
	text := `[{"name":"web","healthy":true},{"name":"db","healthy":false},{"name":"cache","healthy":false}]`
	var items []Item
	if err := json.Unmarshal([]byte(text), &items); err != nil {
		fmt.Println(err)
		return
	}
	for _, it := range items {
		if !it.Healthy {
			fmt.Println(it.Name)
		}
	}
}
@@ expect
db
cache

## Write JSON
id: jsonwrite
task: Print the Service value as JSON on one line, with the keys name and replicas (use struct tags). Do not print the Secret field.
hint: Use the tag `json:"-"` to hide a field, then json.Marshal.
@@ start
package main

import "fmt"

type Service struct {
	Name     string
	Replicas int
	Secret   string
}

func main() {
	s := Service{"api", 3, "hunter2"}
	fmt.Println(s)
}
@@ sol
package main

import (
	"encoding/json"
	"fmt"
)

type Service struct {
	Name     string `json:"name"`
	Replicas int    `json:"replicas"`
	Secret   string `json:"-"`
}

func main() {
	s := Service{"api", 3, "hunter2"}
	b, _ := json.Marshal(s)
	fmt.Println(string(b))
}
@@ expect
{"name":"api","replicas":3}

## Parse a duration
id: duration
task: Use time.ParseDuration to read "1h30m" and print the number of minutes as an integer. Then print the error text for the input "abc" if parsing fails.
hint: d.Minutes() returns a float64. Convert with int(...).
@@ start
package main

import "fmt"

func main() {
	fmt.Println("write your answer here")
}
@@ sol
package main

import (
	"fmt"
	"time"
)

func main() {
	d, _ := time.ParseDuration("1h30m")
	fmt.Println(int(d.Minutes()))
	_, err := time.ParseDuration("abc")
	fmt.Println(err)
}
@@ expect
90
time: invalid duration "abc"

## Parse a CIDR
id: cidr
task: Use net.ParseCIDR on "10.1.2.3/24". Print the network address with its prefix (10.1.2.0/24) and whether the network contains 10.1.2.200.
hint: ParseCIDR returns the IP, a *net.IPNet and an error. ipnet.String() prints the network.
@@ start
package main

import "fmt"

func main() {
	fmt.Println("write your answer here")
}
@@ sol
package main

import (
	"fmt"
	"net"
)

func main() {
	_, n, err := net.ParseCIDR("10.1.2.3/24")
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(n.String())
	fmt.Println(n.Contains(net.ParseIP("10.1.2.200")))
}
@@ expect
10.1.2.0/24
true

## Backoff delays
id: backoff
task: Write backoff(attempt int) time.Duration that returns 100ms times 2 to the power of attempt, but never more than 1 second. Print the delays for attempts 0 to 5.
hint: Use bit shift: 100 * time.Millisecond << attempt.
@@ start
package main

import (
	"fmt"
	"time"
)

func backoff(attempt int) time.Duration {
	return 0
}

func main() {
	for i := 0; i <= 5; i++ {
		fmt.Println(backoff(i))
	}
}
@@ sol
package main

import (
	"fmt"
	"time"
)

func backoff(attempt int) time.Duration {
	d := 100 * time.Millisecond << attempt
	if d > time.Second {
		return time.Second
	}
	return d
}

func main() {
	for i := 0; i <= 5; i++ {
		fmt.Println(backoff(i))
	}
}
@@ expect
100ms
200ms
400ms
800ms
1s
1s

## Sort by a field
id: sortby
task: Sort the services by Replicas from high to low, then by Name. Use sort.Slice and print the names in order.
hint: In the less function compare Replicas first and fall back to Name.
@@ start
package main

import "fmt"

type Svc struct {
	Name     string
	Replicas int
}

func main() {
	list := []Svc{{"web", 3}, {"api", 5}, {"db", 3}, {"cache", 1}}
	for _, s := range list {
		fmt.Println(s.Name)
	}
}
@@ sol
package main

import (
	"fmt"
	"sort"
)

type Svc struct {
	Name     string
	Replicas int
}

func main() {
	list := []Svc{{"web", 3}, {"api", 5}, {"db", 3}, {"cache", 1}}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Replicas != list[j].Replicas {
			return list[i].Replicas > list[j].Replicas
		}
		return list[i].Name < list[j].Name
	})
	for _, s := range list {
		fmt.Println(s.Name)
	}
}
@@ expect
api
db
web
cache

## Split and trim text
id: strings
task: Split "api, db , cache,,web" on commas, trim spaces, drop empty items and print the result joined by a pipe character.
hint: strings.Split, strings.TrimSpace and strings.Join.
@@ start
package main

import "fmt"

func main() {
	fmt.Println("write your answer here")
}
@@ sol
package main

import (
	"fmt"
	"strings"
)

func main() {
	var out []string
	for _, p := range strings.Split("api, db , cache,,web", ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	fmt.Println(strings.Join(out, "|"))
}
@@ expect
api|db|cache|web

## Match a log line
id: regexp
task: Use a regular expression to find the status code and path in the line `GET /health 503 12ms`. Print path then code, separated by a space.
hint: regexp.MustCompile with groups, then FindStringSubmatch.
@@ start
package main

import "fmt"

func main() {
	line := "GET /health 503 12ms"
	fmt.Println(line)
}
@@ sol
package main

import (
	"fmt"
	"regexp"
)

func main() {
	line := "GET /health 503 12ms"
	re := regexp.MustCompile(`^\w+ (\S+) (\d{3}) `)
	m := re.FindStringSubmatch(line)
	fmt.Println(m[1], m[2])
}
@@ expect
/health 503

## Read lines from text
id: scanner
task: Read the multi-line text with bufio.Scanner. Print how many lines contain ERROR.
hint: Create the scanner with bufio.NewScanner(strings.NewReader(text)).
@@ start
package main

import "fmt"

func main() {
	text := "INFO start\nERROR disk\nINFO ok\nERROR net\nERROR dns\n"
	fmt.Println(len(text))
}
@@ sol
package main

import (
	"bufio"
	"fmt"
	"strings"
)

func main() {
	text := "INFO start\nERROR disk\nINFO ok\nERROR net\nERROR dns\n"
	sc := bufio.NewScanner(strings.NewReader(text))
	n := 0
	for sc.Scan() {
		if strings.Contains(sc.Text(), "ERROR") {
			n++
		}
	}
	fmt.Println(n)
}
@@ expect
3

## A table-driven check
id: table
task: Write isPrivate(ip string) bool for the ranges 10.x.x.x and 192.168.x.x (use net.ParseIP and the To4 bytes). Loop over a table of cases and print PASS or FAIL for each.
hint: ip.To4() returns four bytes. 10.x is b[0] == 10. 192.168.x is b[0] == 192 && b[1] == 168.
@@ start
package main

import "fmt"

func isPrivate(ip string) bool {
	return false
}

func main() {
	cases := []struct {
		ip   string
		want bool
	}{{"10.0.0.1", true}, {"192.168.1.5", true}, {"8.8.8.8", false}, {"172.32.0.1", false}}
	for _, c := range cases {
		if isPrivate(c.ip) == c.want {
			fmt.Println("PASS", c.ip)
		} else {
			fmt.Println("FAIL", c.ip)
		}
	}
}
@@ sol
package main

import (
	"fmt"
	"net"
)

func isPrivate(ip string) bool {
	p := net.ParseIP(ip)
	if p == nil {
		return false
	}
	b := p.To4()
	if b == nil {
		return false
	}
	return b[0] == 10 || (b[0] == 192 && b[1] == 168)
}

func main() {
	cases := []struct {
		ip   string
		want bool
	}{{"10.0.0.1", true}, {"192.168.1.5", true}, {"8.8.8.8", false}, {"172.32.0.1", false}}
	for _, c := range cases {
		if isPrivate(c.ip) == c.want {
			fmt.Println("PASS", c.ip)
		} else {
			fmt.Println("FAIL", c.ip)
		}
	}
}
@@ expect
PASS 10.0.0.1
PASS 192.168.1.5
PASS 8.8.8.8
PASS 172.32.0.1

## A generic helper
id: generics
task: Write a generic function Filter[T any](items []T, keep func(T) bool) []T. Use it to keep the even numbers of 1 to 8, and the strings longer than 3 letters.
hint: Declare the type parameter in square brackets after the name.
@@ start
package main

import "fmt"

func main() {
	fmt.Println([]int{1, 2, 3, 4, 5, 6, 7, 8})
	fmt.Println([]string{"api", "cache", "db", "worker"})
}
@@ sol
package main

import "fmt"

func Filter[T any](items []T, keep func(T) bool) []T {
	var out []T
	for _, it := range items {
		if keep(it) {
			out = append(out, it)
		}
	}
	return out
}

func main() {
	fmt.Println(Filter([]int{1, 2, 3, 4, 5, 6, 7, 8}, func(n int) bool { return n%2 == 0 }))
	fmt.Println(Filter([]string{"api", "cache", "db", "worker"}, func(s string) bool { return len(s) > 3 }))
}
@@ expect
[2 4 6 8]
[cache worker]

## A simple HTTP handler test
id: handler
task: Use httptest to call a handler that answers "ok" with status 200 on /healthz and 404 otherwise. Print the status code and body for /healthz and then the status code for /other.
hint: httptest.NewRequest and httptest.NewRecorder let you call a handler without a network.
@@ start
package main

import (
	"fmt"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
}

func main() {
	fmt.Println("not implemented")
	_ = handler
}
@@ sol
package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
)

func handler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/healthz" {
		fmt.Fprint(w, "ok")
		return
	}
	http.NotFound(w, r)
}

func main() {
	rec := httptest.NewRecorder()
	handler(rec, httptest.NewRequest("GET", "/healthz", nil))
	fmt.Println(rec.Code, rec.Body.String())
	rec = httptest.NewRecorder()
	handler(rec, httptest.NewRequest("GET", "/other", nil))
	fmt.Println(rec.Code)
}
@@ expect
200 ok
404

## Remove duplicates, keep the order
id: dedupe
task: Write dedupe(items []string) []string. It returns the items with repeated values removed, keeping the first occurrence of each in the original order.
hint: A map[string]bool remembers what you have already seen.
@@ start
package main

import "fmt"

func dedupe(items []string) []string {
	return items
}

func main() {
	fmt.Println(dedupe([]string{"a", "b", "a", "c", "b", "d"}))
	fmt.Println(len(dedupe(nil)))
}
@@ sol
package main

import "fmt"

func dedupe(items []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, it := range items {
		if !seen[it] {
			seen[it] = true
			out = append(out, it)
		}
	}
	return out
}

func main() {
	fmt.Println(dedupe([]string{"a", "b", "a", "c", "b", "d"}))
	fmt.Println(len(dedupe(nil)))
}
@@ expect
[a b c d]
0

## A health check with a deadline
id: healthcheck
task: check(name string, delay time.Duration) tells whether the fake service answers within 100 ms. Run checks for api (20 ms) and db (300 ms) and print "api up" and "db down".
hint: Use select with time.After, as in the timeout exercise, and a goroutine that sleeps for the delay.
@@ start
package main

import (
	"fmt"
	"time"
)

func check(name string, delay time.Duration) bool {
	return false
}

func main() {
	for _, c := range []struct {
		n string
		d time.Duration
	}{{"api", 20 * time.Millisecond}, {"db", 300 * time.Millisecond}} {
		if check(c.n, c.d) {
			fmt.Println(c.n, "up")
		} else {
			fmt.Println(c.n, "down")
		}
	}
}
@@ sol
package main

import (
	"fmt"
	"time"
)

func check(name string, delay time.Duration) bool {
	ch := make(chan bool, 1)
	go func() {
		time.Sleep(delay)
		ch <- true
	}()
	select {
	case <-ch:
		return true
	case <-time.After(100 * time.Millisecond):
		return false
	}
}

func main() {
	for _, c := range []struct {
		n string
		d time.Duration
	}{{"api", 20 * time.Millisecond}, {"db", 300 * time.Millisecond}} {
		if check(c.n, c.d) {
			fmt.Println(c.n, "up")
		} else {
			fmt.Println(c.n, "down")
		}
	}
}
@@ expect
api up
db down

## Max of a slice
id: maxslice
task: Write maxOf(nums []int) (int, bool). It returns the largest value and true, or 0 and false for an empty slice. Print the result for 4, 9, 2 and then for an empty slice.
hint: Return early for an empty slice. Track the largest value while looping.
@@ start
package main

import "fmt"

func maxOf(nums []int) (int, bool) {
	return 0, false
}

func main() {
	fmt.Println(maxOf([]int{4, 9, 2}))
	fmt.Println(maxOf(nil))
}
@@ sol
package main

import "fmt"

func maxOf(nums []int) (int, bool) {
	if len(nums) == 0 {
		return 0, false
	}
	m := nums[0]
	for _, n := range nums[1:] {
		if n > m {
			m = n
		}
	}
	return m, true
}

func main() {
	fmt.Println(maxOf([]int{4, 9, 2}))
	fmt.Println(maxOf(nil))
}
@@ expect
9 true
0 false

## Reverse a string
id: reversestr
task: Write reverse(s string) string that reverses a string, including non-ASCII characters. Print reverse("deploy") and reverse("héllo").
hint: Convert to []rune, swap from both ends, convert back.
@@ start
package main

import "fmt"

func reverse(s string) string {
	return s
}

func main() {
	fmt.Println(reverse("deploy"))
	fmt.Println(reverse("héllo"))
}
@@ sol
package main

import "fmt"

func reverse(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

func main() {
	fmt.Println(reverse("deploy"))
	fmt.Println(reverse("héllo"))
}
@@ expect
yolped
olléh

## Count words case-insensitively
id: wordfold
task: Write count(words []string) map[string]int that counts words ignoring case. Print the counts for Error, error, WARN, error in sorted key order, one per line as key=value.
hint: strings.ToLower for the key. Sort the keys before printing because map order is random.
@@ start
package main

import "fmt"

func count(words []string) map[string]int {
	return map[string]int{}
}

func main() {
	m := count([]string{"Error", "error", "WARN", "error"})
	fmt.Println(len(m))
}
@@ sol
package main

import (
	"fmt"
	"sort"
	"strings"
)

func count(words []string) map[string]int {
	m := map[string]int{}
	for _, w := range words {
		m[strings.ToLower(w)]++
	}
	return m
}

func main() {
	m := count([]string{"Error", "error", "WARN", "error"})
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Printf("%s=%d\n", k, m[k])
	}
}
@@ expect
error=3
warn=1

## A struct with a method
id: structmethod
task: Define type Server struct with Name string and CPU int. Add a method Label() string that returns Name and CPU like "web-1 (4 cpu)". Print the label for Server{"web-1", 4}.
hint: A method is a function with a receiver: func (s Server) Label() string.
@@ start
package main

import "fmt"

type Server struct {
	Name string
	CPU  int
}

func main() {
	s := Server{"web-1", 4}
	fmt.Println(s.Name)
}
@@ sol
package main

import "fmt"

type Server struct {
	Name string
	CPU  int
}

func (s Server) Label() string {
	return fmt.Sprintf("%s (%d cpu)", s.Name, s.CPU)
}

func main() {
	s := Server{"web-1", 4}
	fmt.Println(s.Label())
}
@@ expect
web-1 (4 cpu)

## Build a set from a slice
id: setdedupe
task: Write union(a, b []string) []string that returns the sorted unique values from both slices. Print union of [b a] and [c b].
hint: Use map[string]bool as a set, then collect and sort the keys.
@@ start
package main

import "fmt"

func union(a, b []string) []string {
	return append(a, b...)
}

func main() {
	fmt.Println(union([]string{"b", "a"}, []string{"c", "b"}))
}
@@ sol
package main

import (
	"fmt"
	"sort"
)

func union(a, b []string) []string {
	set := map[string]bool{}
	for _, v := range append(append([]string{}, a...), b...) {
		set[v] = true
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func main() {
	fmt.Println(union([]string{"b", "a"}, []string{"c", "b"}))
}
@@ expect
[a b c]

## Parse an integer with a default
id: atoidefault
task: Write port(s string, def int) int. It parses s with strconv.Atoi and returns def when parsing fails or the value is outside 1 to 65535. Print port("8080", 80), port("abc", 80) and port("70000", 80).
hint: Check the error first, then the range.
@@ start
package main

import "fmt"

func port(s string, def int) int {
	return def
}

func main() {
	fmt.Println(port("8080", 80), port("abc", 80), port("70000", 80))
}
@@ sol
package main

import (
	"fmt"
	"strconv"
)

func port(s string, def int) int {
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 || n > 65535 {
		return def
	}
	return n
}

func main() {
	fmt.Println(port("8080", 80), port("abc", 80), port("70000", 80))
}
@@ expect
8080 80 80

## A channel as a work queue
id: chanqueue
task: Start one goroutine that sends the numbers 1 to 5 on a channel and closes it. In main, receive with range and print the sum.
hint: The sender must close the channel so the range loop ends.
@@ start
package main

import "fmt"

func main() {
	ch := make(chan int)
	sum := 0
	fmt.Println(sum, ch == nil)
}
@@ sol
package main

import "fmt"

func main() {
	ch := make(chan int)
	go func() {
		for i := 1; i <= 5; i++ {
			ch <- i
		}
		close(ch)
	}()
	sum := 0
	for v := range ch {
		sum += v
	}
	fmt.Println(sum)
}
@@ expect
15

## Protect a counter with a mutex
id: mutexcounter
task: Start 50 goroutines that each add 1 to a shared counter, guarded by sync.Mutex. Wait with sync.WaitGroup and print the counter.
hint: Lock before the increment and unlock after it. Call wg.Add(1) before starting each goroutine.
@@ start
package main

import "fmt"

func main() {
	counter := 0
	fmt.Println(counter)
}
@@ sol
package main

import (
	"fmt"
	"sync"
)

func main() {
	var mu sync.Mutex
	var wg sync.WaitGroup
	counter := 0
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			counter++
			mu.Unlock()
		}()
	}
	wg.Wait()
	fmt.Println(counter)
}
@@ expect
50

## Select with a default
id: selectdefault
task: Make a buffered channel of size 1. Try to send "a" twice using select with a default case. Print "sent a" when the send works and "full" when it does not.
hint: select { case ch <- v: ... default: ... } never blocks.
@@ start
package main

import "fmt"

func main() {
	ch := make(chan string, 1)
	fmt.Println(len(ch))
}
@@ sol
package main

import "fmt"

func main() {
	ch := make(chan string, 1)
	for i := 0; i < 2; i++ {
		select {
		case ch <- "a":
			fmt.Println("sent a")
		default:
			fmt.Println("full")
		}
	}
}
@@ expect
sent a
full

## Format a table row
id: printfwidth
task: Print three rows with fmt.Printf using a left-aligned name column of width 8 and a right-aligned number column of width 5: api 12, db 7, cache 130.
hint: Use %-8s and %5d in the format string.
@@ start
package main

import "fmt"

func main() {
	fmt.Println("api", 12)
}
@@ sol
package main

import "fmt"

func main() {
	rows := []struct {
		n string
		v int
	}{{"api", 12}, {"db", 7}, {"cache", 130}}
	for _, r := range rows {
		fmt.Printf("%-8s%5d\n", r.n, r.v)
	}
}
@@ expect
api        12
db          7
cache     130

## Check an error with errors.Is
id: errorsis
task: Define var ErrNotFound = errors.New("not found"). Write find(id int) error that returns fmt.Errorf("find %d: %w", id, ErrNotFound) when id is 0, otherwise nil. Print whether errors.Is(find(0), ErrNotFound) and errors.Is(find(1), ErrNotFound).
hint: The %w verb wraps the error so errors.Is can unwrap it.
@@ start
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func find(id int) error {
	return nil
}

func main() {
	fmt.Println(errors.Is(find(0), ErrNotFound), errors.Is(find(1), ErrNotFound))
}
@@ sol
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func find(id int) error {
	if id == 0 {
		return fmt.Errorf("find %d: %w", id, ErrNotFound)
	}
	return nil
}

func main() {
	fmt.Println(errors.Is(find(0), ErrNotFound), errors.Is(find(1), ErrNotFound))
}
@@ expect
true false

## Read lines from a string reader
id: bufioreader
task: Use bufio.NewScanner on strings.NewReader of "a\nb\n\nc" and print how many non-empty lines there are.
hint: Loop with scanner.Scan() and use scanner.Text().
@@ start
package main

import "fmt"

func main() {
	n := 0
	fmt.Println(n)
}
@@ sol
package main

import (
	"bufio"
	"fmt"
	"strings"
)

func main() {
	sc := bufio.NewScanner(strings.NewReader("a\nb\n\nc"))
	n := 0
	for sc.Scan() {
		if sc.Text() != "" {
			n++
		}
	}
	fmt.Println(n)
}
@@ expect
3

## Decode JSON into a struct slice
id: jsonslice
task: Decode the JSON [{"name":"api","up":true},{"name":"db","up":false}] into a slice of structs with json tags and print the names of the services that are down.
hint: Tag fields like `json:"name"`, then json.Unmarshal into a slice.
@@ start
package main

import "fmt"

func main() {
	fmt.Println("none")
}
@@ sol
package main

import (
	"encoding/json"
	"fmt"
)

type Svc struct {
	Name string `json:"name"`
	Up   bool   `json:"up"`
}

func main() {
	data := `[{"name":"api","up":true},{"name":"db","up":false}]`
	var list []Svc
	if err := json.Unmarshal([]byte(data), &list); err != nil {
		fmt.Println("error:", err)
		return
	}
	for _, s := range list {
		if !s.Up {
			fmt.Println(s.Name)
		}
	}
}
@@ expect
db

## Check an HTTP status class
id: statusclass
task: Write class(code int) string that returns "ok" for 200 to 299, "client" for 400 to 499, "server" for 500 to 599, and "other" otherwise. Print class for 204, 404, 503 and 301.
hint: A switch with no tag and case conditions reads cleanly.
@@ start
package main

import "fmt"

func class(code int) string {
	return "other"
}

func main() {
	for _, c := range []int{204, 404, 503, 301} {
		fmt.Println(c, class(c))
	}
}
@@ sol
package main

import "fmt"

func class(code int) string {
	switch {
	case code >= 200 && code < 300:
		return "ok"
	case code >= 400 && code < 500:
		return "client"
	case code >= 500 && code < 600:
		return "server"
	}
	return "other"
}

func main() {
	for _, c := range []int{204, 404, 503, 301} {
		fmt.Println(c, class(c))
	}
}
@@ expect
204 ok
404 client
503 server
301 other

## Sort structs by two keys
id: sortslice
task: Sort a slice of Incident{Sev int, Name string} by severity ascending, then by name. Print each as sev:name for (2,"db"), (1,"web"), (2,"api"), (1,"auth").
hint: sort.Slice with a less function that compares Sev first and Name when they are equal.
@@ start
package main

import "fmt"

type Incident struct {
	Sev  int
	Name string
}

func main() {
	list := []Incident{{2, "db"}, {1, "web"}, {2, "api"}, {1, "auth"}}
	for _, i := range list {
		fmt.Printf("%d:%s\n", i.Sev, i.Name)
	}
}
@@ sol
package main

import (
	"fmt"
	"sort"
)

type Incident struct {
	Sev  int
	Name string
}

func main() {
	list := []Incident{{2, "db"}, {1, "web"}, {2, "api"}, {1, "auth"}}
	sort.Slice(list, func(a, b int) bool {
		if list[a].Sev != list[b].Sev {
			return list[a].Sev < list[b].Sev
		}
		return list[a].Name < list[b].Name
	})
	for _, i := range list {
		fmt.Printf("%d:%s\n", i.Sev, i.Name)
	}
}
@@ expect
1:auth
1:web
2:api
2:db

## Run a function with a timeout using a ticker
id: ticker
task: Use time.NewTicker with a 10 ms interval. Read three ticks, stop the ticker, and print "ticks: 3".
hint: defer ticker.Stop(), then receive from ticker.C three times in a loop.
@@ start
package main

import "fmt"

func main() {
	fmt.Println("ticks: 0")
}
@@ sol
package main

import (
	"fmt"
	"time"
)

func main() {
	t := time.NewTicker(10 * time.Millisecond)
	defer t.Stop()
	n := 0
	for n < 3 {
		<-t.C
		n++
	}
	fmt.Printf("ticks: %d\n", n)
}
@@ expect
ticks: 3

## Embed a struct
id: embed
task: Define Base with Name string and a method Hello() string returning "hi NAME". Define Worker that embeds Base and has Queue string. Create Worker{Base{"w1"}, "jobs"} and print w.Hello() and w.Queue.
hint: Embedding promotes the methods and fields of Base to Worker.
@@ start
package main

import "fmt"

type Base struct{ Name string }

type Worker struct {
	Base
	Queue string
}

func main() {
	w := Worker{Base{"w1"}, "jobs"}
	fmt.Println(w.Name)
}
@@ sol
package main

import "fmt"

type Base struct{ Name string }

func (b Base) Hello() string { return "hi " + b.Name }

type Worker struct {
	Base
	Queue string
}

func main() {
	w := Worker{Base{"w1"}, "jobs"}
	fmt.Println(w.Hello())
	fmt.Println(w.Queue)
}
@@ expect
hi w1
jobs

## Closures for counters
id: closure
task: Write counter() func() int that returns a function which gives 1, 2, 3 on successive calls. Make two counters and print a(), a(), b(), a().
hint: Declare a variable inside counter and return a function that increments it.
@@ start
package main

import "fmt"

func counter() func() int {
	return func() int { return 0 }
}

func main() {
	a, b := counter(), counter()
	fmt.Println(a(), a(), b(), a())
}
@@ sol
package main

import "fmt"

func counter() func() int {
	n := 0
	return func() int {
		n++
		return n
	}
}

func main() {
	a, b := counter(), counter()
	fmt.Println(a(), a(), b(), a())
}
@@ expect
1 2 1 3

## Variadic helper
id: variadic
task: Write joinNonEmpty(sep string, parts ...string) string that joins only the non-empty parts. Print joinNonEmpty("-", "web", "", "prod") and joinNonEmpty("-").
hint: Collect non-empty parts in a slice and call strings.Join.
@@ start
package main

import "fmt"

func joinNonEmpty(sep string, parts ...string) string {
	return ""
}

func main() {
	fmt.Println(joinNonEmpty("-", "web", "", "prod"))
	fmt.Printf("[%s]\n", joinNonEmpty("-"))
}
@@ sol
package main

import (
	"fmt"
	"strings"
)

func joinNonEmpty(sep string, parts ...string) string {
	var keep []string
	for _, p := range parts {
		if p != "" {
			keep = append(keep, p)
		}
	}
	return strings.Join(keep, sep)
}

func main() {
	fmt.Println(joinNonEmpty("-", "web", "", "prod"))
	fmt.Printf("[%s]\n", joinNonEmpty("-"))
}
@@ expect
web-prod
[]

