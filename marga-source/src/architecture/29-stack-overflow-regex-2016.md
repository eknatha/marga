# Stack Overflow regular expression outage, July 2016
company: Stack Overflow
date: 20 July 2016
modules: python, sre, observability
calc: capacity, error-budget
source: Stack Exchange status blog: Outage postmortem, July 20, 2016 | https://stackstatus.tumblr.com/post/147710624694/outage-postmortem-july-20-2016
summary: A post with a long run of white space made a regular expression take exponential time, and web servers spent all their CPU time on it.

## Before you read on
A regular expression checks every post that a user submits. What happens when the input is a very long string with a bad pattern for the matcher?

## The system
Stack Overflow shows posts rendered from user text. On the way in, the site trims leading and trailing white space with a regular expression. The site runs on a small number of web servers behind load balancers.

## Timeline as reported
- A user posted a question that contained about 20,000 white space characters, followed by a character that was not white space, on a line.
- As reported, the regular expression used to trim white space had to backtrack through that input, and the work grew very fast with the length of the string.
- The post was on the home page of the site, so every server that rendered it used up its CPU for a long time.
- The load balancers marked the servers as unhealthy, and the site became unavailable for about 34 minutes.
- Engineers found the cause by looking at the traces of the slow requests, removed the post, and later replaced the expression with a simple function.

## Root cause
A regular expression with catastrophic backtracking, applied to untrusted input with no time limit, on the page that all users see.

## What changed
- Stack Overflow replaced the expression with a plain string trim, and added a time limit to expression matching.
- The team also reviewed its other patterns, and its health checks, to see how one slow request could cause the loss of many servers.

## Trade-offs to weigh
- **Regular expressions against plain code.** A pattern is short. Simple loops are longer but have predictable run time.
- **Input limits against flexibility.** A length limit on posts would have helped. Users complain when valid posts are refused.
- **Aggressive health checks against patience.** Quick removal of slow servers shortens a bad request, and sends the load to fewer servers.

## Try the calculators
In the capacity calculator, see how losing servers one by one raises the load on those that remain. In the error budget calculator, see what 34 minutes costs in a quarter.
