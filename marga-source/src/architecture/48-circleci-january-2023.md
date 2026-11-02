# CircleCI security incident, January 2023
company: CircleCI
date: 16 December 2022 to 4 January 2023
modules: cicd, security, sre, cloud-iam
calc: error-budget, recovery
source: CircleCI incident report | https://circleci.com/blog/jan-4-2023-incident-report/
summary: Malware on one engineer laptop stole a session token, and an attacker used it to read customer secrets that were stored in the CI service.

## Before you read on
An engineer's laptop has malware that your antivirus does not detect. What can the malware steal, and what could it reach with it?

## The system
CircleCI runs build jobs for customers. Customers keep secrets, such as tokens and keys, in the service, so that their builds can reach other systems. The company's engineers have access to production systems with the right authorisation.

## Timeline as reported
- On about 16 December 2022, malware was installed on a laptop of one engineer who had access to production, and stole a session cookie that had already passed two-factor authentication.
- The attacker used the cookie to impersonate the engineer and to get access to production systems, and then to some data stores.
- Between 19 and 31 December, the attacker took data, including encryption keys and customer secrets and tokens that were stored in the service.
- On 4 January 2023, the company told customers to rotate all of their secrets, and published guidance. A customer had reported unusual activity.
- The company improved its security, and later published the full report of the investigation.

## Root cause
Endpoint malware stole a valid session after multi-factor authentication, and the access of that engineer was wide enough to reach the stores of customer secrets.

## What changed
- CircleCI rotated keys and tokens, and shortened session lifetimes.
- It added stronger device checks, more limits on who can access production data, and better detection of unusual activity.

## Lessons learned
- Treat a stolen session as stronger than a stolen password: bind sessions to devices, and keep them short.
- Limit production access of each engineer, with just-in-time elevation and approval.
- Keep encryption keys apart from the data they protect.
- Give customers a clear, fast way to rotate all secrets, and tell them early.

## Trade-offs to weigh
- **Long sessions against security.** Short sessions annoy people and shorten the life of a stolen cookie.
- **Broad engineer access against least privilege.** Broad access makes support quicker, and gives an attacker the same reach.
- **Storing customer secrets.** A CI service must hold secrets. Encryption helps only if the keys are kept apart.

## Try the calculators
In the error budget calculator, think of how a 19-day gap between theft and notice compares with a detection objective. In the backup, RTO and RPO calculator, see how long a full rotation of secrets takes for your systems.
