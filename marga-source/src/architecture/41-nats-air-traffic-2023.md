# UK air traffic control flight plan failure, August 2023
company: NATS
date: 28 August 2023
modules: sre, python, observability
calc: recovery, error-budget
source: UK Civil Aviation Authority: independent review of the NATS en route failure | https://www.caa.co.uk/
summary: An automated flight plan system hit an unusual input, stopped to protect safety, and needed hours of manual work to restart, causing days of flight disruption.

## Before you read on
A system is designed to stop rather than risk a wrong answer. What happens to the people who depend on it, and how long does a manual process take to restart?

## The system
NATS provides air traffic services in UK airspace. Flight plans arrive from airlines and go to an automated system, which processes them for controllers. The system was designed to stop if it cannot process a message safely, so that it does not give wrong data.

## Timeline as reported
- On a busy bank holiday Monday, a flight plan arrived with two different waypoints that had the same identifier, one in the UK and one in another country.
- As reported, the software could not decide which waypoint was meant, and a rule in the code made it stop the primary system, as a safety measure.
- The backup system took over the same data, hit the same input and also stopped.
- Staff had to enter flight plans by hand, and the number of flights that could be handled fell. Airlines cancelled or delayed thousands of flights.
- Engineers, with the help of the supplier, found the problematic message, removed it, and restarted. The system was working again in some hours, and the backlog on airlines took days to clear.

## Root cause
A rare input that the software did not handle, with the primary and the backup running the same code and failing in the same way, and a safe mode that needed expert effort to leave.

## What changed
- The review recommended better handling of rare input, so the system rejects one message instead of stopping.
- It also recommended faster fault diagnosis by the supplier, clearer procedures, and better communication with airlines and the public.

## Lessons learned
- Reject or quarantine one bad message instead of stopping the whole system.
- Use diverse implementations or different data paths for the backup, so one input cannot stop both.
- Plan, document and practise how a restart is done by operators, with the supplier on call.
- Prepare a communication plan for people who depend on the service.

## Trade-offs to weigh
- **Fail safe against stay available.** Stopping protects against wrong data. It also stops the work for everybody.
- **Identical backup against diverse backup.** An identical backup is easy to run. It fails on the same input.
- **Manual fallback.** A manual process is a good last resort, and it cannot match automated throughput.

## Try the calculators
In the redundancy calculator, see how availability changes when the primary and the backup share the same fault. In the backup, RTO and RPO calculator, see how several hours of recovery time look against a yearly objective.
