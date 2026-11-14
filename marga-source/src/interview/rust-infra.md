## Why Rust for infrastructure tools?
level: mid
Single static binaries, no runtime, fast start and memory safety without a garbage collector, which suits agents and CLIs. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## Explain ownership and borrowing.
level: junior
Each value has one owner. You can lend it out as many shared references or one mutable reference at a time, and the compiler checks it.

## Result versus panic?
level: mid
Use Result for expected failures and propagate with ?. Panic only for bugs. I use anyhow in applications and thiserror in libraries. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you build a CLI?
level: mid
clap derive for arguments, serde for config and JSON, proper exit codes and tests with fake inputs. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## When would you use async?
level: mid
For many concurrent network connections. I use tokio, avoid blocking calls and add timeouts and cancellation. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you ship a Rust tool?
level: mid
Cross compile static binaries for each target, build in CI with caching, sign and publish checksums. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.
