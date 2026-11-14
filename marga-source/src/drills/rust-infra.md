## Value used after move
level: junior
The compiler rejects a program.

```text
$ cargo build
error[E0382]: borrow of moved value: `config`
```
? What does it mean?
+ The value was moved to another owner; borrow it with & or clone it deliberately
- The compiler is broken
- Add unsafe
why: Ownership moved so the old name is no longer valid.

## Unwrap panics in production
level: mid
A tool crashes on a missing file.

```text
$ ./agent
thread main panicked at unwrap on Err: NotFound
```
? What should you do?
+ Return a Result and print a clear error
- Remove the file check
- Catch panics everywhere
why: Libraries and tools should handle errors, not panic.

## CLI flag ignored
level: junior
A new option has no effect.

```text
$ ./tool --dry-run
$ grep -n dry_run src/main.rs
(no matches)
```
? What is the fix?
+ Define the flag in the clap struct and use it in the logic
- Rename the binary
- Use a newer Rust
why: clap derives parsing from the struct fields.

## Blocking call in async code
level: senior
A service stalls under load.

```text
$ grep -n "std::thread::sleep" src/*.rs
src/main.rs:42
```
? What is wrong?
+ Blocking the runtime thread stalls other tasks; use tokio sleep or spawn_blocking
- Use more threads
- Remove async
why: One blocked worker delays many tasks.

## Binary fails on Alpine
level: mid
A binary built on a laptop will not start in a minimal image.

```text
$ ./agent
exec ./agent: no such file or directory
$ ldd agent
libc.so.6 => not found
```
? What is the fix?
+ Build a static binary with the musl target
- Install Ubuntu
- Rename the file
why: The binary expected glibc that the image lacks.

## Tests need a real service
level: mid
Unit tests call a real API.

```text
$ cargo test
test fetch_status ... FAILED (connection refused)
```
? What should change?
+ Put the client behind a trait and use a fake in tests
- Skip tests
- Run in production
why: Traits let tests inject a fake.
