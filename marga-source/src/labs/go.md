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

