# Capital One cloud data breach, 2019
company: Capital One
date: March to July 2019
modules: cloud, security, linux, cloud-iam
calc: error-budget, cloud-cost
source: US Department of Justice press release on the case | https://www.justice.gov/usao-wdwa/pr/seattle-tech-worker-arrested-data-theft-involving-large-financial-services-company
summary: A server-side request forgery flaw in a web application firewall let an attacker obtain role credentials from the metadata service, and the role could read many storage buckets.

## Before you read on
An application can be tricked into fetching a URL of the attacker's choice. What internal address would an attacker ask it to fetch first?

## The system
Capital One ran applications in the public cloud, with a web application firewall on servers that sat in front of some of them. Each server had a role with permissions, and credentials for that role were available through an internal metadata address.

## Timeline as reported
- An attacker found a misconfigured web application firewall that could be made to send requests on their behalf.
- As reported in court documents, the attacker used it to call the metadata service, which returned temporary credentials for the role of the server.
- The role had broad permissions, and the credentials were used to list and copy data from many storage buckets.
- The data of about 100 million people in the United States and about 6 million in Canada was taken, according to the company.
- A tip from an outside researcher led the company to find the problem in July, fix it, and notify authorities and customers.

## Root cause
A request forgery flaw, a role with far more permissions than the firewall needed, and a metadata service that returned credentials to any caller on the host.

## What changed
- Capital One fixed the misconfiguration, and improved its monitoring and its control of permissions.
- The company later paid a regulatory penalty. Cloud providers also promoted a newer metadata service version that makes this attack harder.

## Lessons learned
- Give each workload a role with only the permissions that it needs, and review the roles often.
- Require the hardened version of the metadata service and block access to it from application code.
- Alert on unusual listing and copying of large amounts of data from storage.
- Validate and restrict outbound requests that an application makes for users.

## Trade-offs to weigh
- **Convenient permissions against least privilege.** Broad roles are easy to set up. A narrow role would have limited the damage.
- **Metadata access against isolation.** Credentials on the host are convenient, and they can be reached by any code that runs there.
- **Detection speed.** The theft was found only after a tip, a sign that alerts on unusual data access were weak.

## Try the calculators
In the error budget calculator, see how little failure budget a security event of this kind consumes, and why security needs its own objectives. In the cloud cost calculator, note what storage and egress cost when an attacker copies data.
