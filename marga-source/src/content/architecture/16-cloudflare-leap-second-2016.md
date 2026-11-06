# Cloudflare DNS and the leap second, January 2017
company: Cloudflare
date: 1 January 2017
modules: linux, networking, sre
calc: error-budget, redundancy
source: Cloudflare blog: How and why the leap second affected Cloudflare DNS | https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/
summary: A leap second made a clock difference go negative, a value the code never expected, and part of the DNS service failed on New Year.

## Before you read on
Your code measures the time between two events by subtracting two clock readings. Can the result ever be negative, and what would your code do with it?

## The system
Cloudflare runs a DNS service that uses a custom resolver for requests to customers' origin servers. The resolver picks one of several upstream servers, and the choice uses the time elapsed since a server was last used. The software was written in Go.

## Timeline as reported
- At midnight UTC on 1 January 2017, a leap second was added. The system clock repeated a second, so that two readings could show time moving backward.
- The code used the wall clock to compute a duration. At the leap second, the result was negative.
- A random number function in the selection logic was called with a negative value, which caused a panic, and the resolver failed for some requests.
- As reported, a number of customers, about 0.2 percent of HTTP requests in the affected area, saw errors in the first hours, mainly those with the CNAME handling.
- Engineers deployed a fix within hours and the errors stopped.

## Root cause
The code assumed that time never goes backward, and it used the wall clock instead of a monotonic clock to measure an interval.

## What changed
- Cloudflare fixed the code to avoid a negative duration, and noted that Go has since added monotonic clock readings to its time package.
- The company also described the lesson for other teams: use a monotonic clock for durations and do not assume that time is always increasing.

## Lessons learned
- Use a monotonic clock to measure durations and never assume wall time moves forward.
- Test code with simulated clock jumps, including the leap second.
- Treat a negative duration as a possible input and handle it without a crash.
- Roll out fixes in stages, even in an urgent situation.

## Trade-offs to weigh
- **Wall clock against monotonic clock.** The wall clock matches what people see. A monotonic clock never jumps, but cannot be compared across machines.
- **Smearing against stepping.** Some operators spread a leap second over hours. That avoids a repeated second, and it makes servers disagree briefly.
- **Rare events against test effort.** A leap second occurs every few years. A simulated clock jump in tests is cheap.

## Try the calculators
In the error budget calculator, see what a short, partial failure costs in a month. In the redundancy calculator, ask whether more replicas would have helped when every replica runs the same code.
