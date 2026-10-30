## The retry loop that made it worse
module: python
level: Intermediate
minutes: 6
lesson: python/http-apis-and-json
summary: A Python job retried failed API calls with no pause and turned a small slowdown into an outage.
intro: The partner API slows down. Your import job starts retrying instantly, and soon the partner starts refusing everything from you.

### s1
text: Requests start failing with timeouts. What does the job do now?
- Retry a limited number of times with growing delays and some randomness => s2 | 2 | Backoff with jitter gives the service room to recover. Example: Waits of 1, 2, 4 and 8 seconds, each with random jitter, spread out the retries.
- Retry immediately in a loop forever => end-fail | 0 | This hammers a struggling service and keeps it down. Example: Fifty workers retrying instantly produce thousands of requests per second.
- Give up on the first error => s2 | 1 | Safe but loses data for temporary problems. Example: A one-second blip causes a full job failure.

### s2
text: The partner returns 429 with a Retry-After header. What do you do?
- Respect the header, slow down and reduce concurrency => s3 | 2 | The server tells you how long to wait. Example: Retry-After: 30 makes the job pause for 30 seconds and lower workers from 20 to 5.
- Ignore it and retry quickly => s3 | 0 | You get blocked longer. Example: The partner blocks the account for an hour.
- Switch to a different API key => s3 | 0 | This evades limits and breaks the agreement. Example: The partner cancels your access.

### s3
text: Some requests were retried after the server had already processed them. How do you avoid duplicates?
- Send an idempotency key so repeats have no extra effect => s4 | 2 | The server can recognise a repeated request and return the same result. Example: An Idempotency-Key header with a stable id prevents a double charge.
- Hope duplicates are rare => s4 | 0 | Retries make duplicates certain over time. Example: One in a thousand requests creates two orders.
- Retry only GET requests => s4 | 1 | Safe for reads but leaves writes unprotected. Example: Writes fail permanently on a temporary error.

### s4
text: How do you see retry trouble early next time?
- Log attempts, delays and errors and alert on rising retry counts => end-win | 2 | Retries are a signal that a dependency is unhealthy. Example: A chart of retries per minute shows the rise before the outage.
- Read logs only after an outage => end-ok | 1 | You learn the cause, but only after the damage is done. Example: The job is already blocked by the partner.
- Disable logs to save space => end-fail | 0 | You lose the evidence. Example: Nobody knows how many retries occurred.

### end-win
end: win
text: The job retries politely with backoff, honours limits, avoids duplicates and shows trouble early.
takeaway: Backoff with jitter, respect limits and make writes idempotent.

### end-ok
end: ok
text: The job survives, but duplicates or hidden retries could still hurt.
takeaway: Add idempotency and visibility.

### end-fail
end: fail
text: Aggressive retries made the outage longer and got the client blocked.
takeaway: Never retry instantly without limits.

## The script that works only on my laptop
module: python
level: Beginner
minutes: 5
lesson: python/basics-and-environments
summary: A script runs on one machine and fails on another. Make the environment reproducible.
intro: A teammate runs your report script and gets import errors. It worked on your laptop for months.

### s1
text: The script fails with ModuleNotFoundError on another machine. What is the likely cause?
- The dependency is installed on your laptop but not declared anywhere => s2 | 2 | Undeclared dependencies make a script work only where they happen to be installed. Example: You installed requests globally long ago, and no file lists it.
- Python is broken on their machine => s2 | 0 | More likely a missing package. Example: Other scripts run normally there.
- The script is too long => s2 | 0 | Length does not cause import errors. Example: A longer script is not the reason a module is missing.

### s2
text: What is the right way to set the project up?
- Create a virtual environment and list dependencies in a requirements file with versions => s3 | 2 | A venv isolates the project and a file records what is needed. Example: python -m venv .venv then pip install -r requirements.txt on any machine.
- Install everything globally => s3 | 0 | Global installs clash between projects. Example: Two scripts need different versions of the same library.
- Tell the teammate to install what is missing => s3 | 1 | It works once but does not scale. Example: The next person repeats the same discovery.

### s3
text: Versions differ between machines and results change. What helps?
- Pin exact versions and record the Python version => s4 | 2 | Pinning makes builds repeatable. Example: requests==2.31.0 in requirements.txt gives the same library everywhere.
- Use whatever is latest => s4 | 1 | Latest can change behaviour without warning. Example: A major update changes a function signature.
- Copy the site-packages folder => s4 | 0 | This is fragile and platform dependent. Example: Compiled packages do not work on another operating system.

### s4
text: How do you prove the setup works for someone new?
- Rebuild from scratch in a clean environment and run the script => end-win | 2 | A clean build exposes missing steps. Example: Deleting .venv and following the README finds a forgotten dependency.
- Assume it works => end-fail | 0 | Assumptions hide gaps. Example: A new colleague spends a day on setup.
- Test only on your machine => end-ok | 1 | It cannot reveal missing steps. Example: It always passes on the machine that has everything.

### end-win
end: win
text: Anyone can create the environment from the repository and run the script, with the same versions.
takeaway: Declare, isolate and pin your dependencies.

### end-ok
end: ok
text: The script works for the teammate, but without a clean-build test gaps can remain.
takeaway: Prove it from scratch. Review the lesson and try the game again.

### end-fail
end: fail
text: The environment is still undocumented and every new person loses a day.
takeaway: Write the setup down as code. Review the lesson and try the game again.

