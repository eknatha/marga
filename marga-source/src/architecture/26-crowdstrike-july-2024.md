# CrowdStrike content update, July 2024
company: CrowdStrike
date: 19 July 2024
modules: linux, cicd, sre
calc: cells, recovery
source: CrowdStrike remediation and guidance hub | https://www.crowdstrike.com/falcon-content-update-remediation-and-guidance-hub/
summary: A content update to a security sensor read data outside its bounds in a driver, and millions of Windows machines crashed and needed hands-on recovery.

## Before you read on
A security tool runs inside the operating system kernel and updates its detection rules several times a day, on all customers at once. What would you check before such a file goes to everyone?

## The system
The Falcon sensor from CrowdStrike runs on Windows machines with a kernel driver. It receives two kinds of updates: sensor software, which customers can control, and rapid response content, which is data for detection and arrives automatically.

## Timeline as reported
- On 19 July 2024, shortly after 04:00 UTC, a rapid response content update for a new type of named pipe detection was released.
- As reported, the sensor expected 20 input fields, and the new template provided 21 for the interpreter. The mismatch was not caught in testing, because earlier tests used wildcard values for the extra field.
- On machines that were online, the content interpreter read memory outside the array, and the driver crashed. Windows hosts crashed with a blue screen and often could not restart normally.
- The update was withdrawn about 78 minutes later, but machines that had already received it stayed broken.
- The fix had to be applied by hand on each machine, by booting into safe mode or the recovery environment and deleting one file. Airlines, hospitals, banks and others were disrupted for days.

## Root cause
A mismatch between a content template and the sensor interpreter, with checks that did not cover it, and a release process that sent the data to the whole fleet at once.

## What changed
- CrowdStrike said it would add validation and tests for the content and the interpreter, and run staged deployments, starting with a canary group.
- It also gave customers more control over when content updates arrive, and published an analysis of the root cause.

## Trade-offs to weigh
- **Instant protection against staged rollout.** Fast delivery blocks new attacks sooner. A staged one limits the cost of a mistake.
- **Kernel access against stability.** A kernel driver can see more, and its crash stops the entire machine.
- **Customer control against automation.** Customers wanted to choose when to update. Delay can leave them open to new threats.

## Try the calculators
In the cells calculator, compare sending an update to all hosts with sending it to 1 percent first. In the backup, RTO and RPO calculator, see how long a hands-on repair of thousands of machines takes with a given team size.
