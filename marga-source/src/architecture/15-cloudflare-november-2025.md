# Cloudflare bot management file outage, November 2025
company: Cloudflare
date: 18 November 2025
modules: observability, sre, cicd
calc: error-budget, cells
source: Cloudflare blog: 18 November 2025 outage | https://blog.cloudflare.com/18-november-2025-outage/
summary: A database permission change doubled the size of a generated configuration file, and the proxy software that loaded it hit a hard limit and failed.

## Before you read on
A file that is generated every few minutes is pushed to every server. What happens if the file is suddenly twice as large, and which side checks its size?

## The system
Cloudflare proxies a large part of web traffic. Its bot management feature uses a machine-learning model, and the model reads a feature file that a job regenerates frequently from a query on a ClickHouse database. The file is distributed to all machines in the network.

## Timeline as reported
- A change to permissions on the database made a query return duplicate rows. The generated feature file became much larger than before.
- The proxy software preallocates space for a limited number of features. The larger file went over the limit, which caused the software to fail.
- Because the file was rebuilt every few minutes and the database was updated gradually, good and bad files alternated. The network moved between working and failing, which at first looked like a large attack.
- Engineers stopped the generation of the bad file and put a known good file in its place, then restarted the proxy software.
- Core traffic was mostly flowing again in the afternoon, and everything was back to normal a few hours later. Dashboard login and some other services were also affected.

## Root cause
An assumption that a query would always return the same number of rows, a hard limit in the consumer, and a configuration file that was distributed everywhere quickly and without being validated against the limit.

## What changed
- Cloudflare said it would treat internally generated configuration files with the same care as user input.
- It also planned global kill switches for features, a review of failure modes in the proxy modules, and limits on error reports that used up CPU.

## Trade-offs to weigh
- **Fast global propagation against staged rollout.** Fast distribution reacts quickly to attacks. It also spreads a bad file quickly.
- **Fixed limits against dynamic sizes.** Fixed buffers are fast and predictable. They fail hard when the data grows.
- **Fail closed against fail open.** If the module crashes, traffic fails. If it is skipped, the bot protection is gone.

## Try the calculators
In the error budget calculator, see how a few hours of full failure compares with a yearly objective. In the cells calculator, see how a staged rollout limits how many users see the bad file.
