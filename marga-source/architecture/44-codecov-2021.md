# Codecov uploader compromise, 2021
company: Codecov
date: 31 January to 1 April 2021
modules: cicd, security, bash
calc: error-budget, retries
source: Codecov security update | https://about.codecov.io/security-update/
summary: An attacker changed a script that customers downloaded in their build pipelines, and it sent environment variables to an outside server for about two months.

## Before you read on
Your pipeline runs a script that it downloads from a vendor on each build. How do you know that today's script is the one you reviewed?

## The system
Codecov provided a Bash uploader script that customers ran in their CI jobs to send code coverage reports. The script was downloaded at the start of each job from the vendor's servers. CI jobs hold secrets, such as tokens, as environment variables.

## Timeline as reported
- An error in the creation of the vendor's Docker image let an attacker obtain credentials to the storage that held the uploader script.
- From late January, the attacker modified the script to copy the environment of each job and send it to a server that they controlled.
- Customers kept running the changed script in their pipelines, so keys and tokens in their CI environments were sent out.
- In April, a customer noticed that the checksum of the script that they had downloaded did not match the one published in the vendor's repository, and told the vendor.
- The vendor fixed the script, told customers to rotate all secrets that were available to the jobs, and started an investigation.

## Root cause
A trusted script was fetched at run time without verification, the vendor's release process held a credential that could change it, and CI jobs held long-lived secrets in their environment.

## What changed
- Codecov replaced the credentials, improved its release pipeline, and started to sign and verify its uploader.
- Customers rotated secrets, and many moved to verify checksums and to pin tools by version and digest.

## Lessons learned
- Verify the checksum or the signature of anything that you download in a pipeline, or vendor a reviewed copy.
- Give CI jobs short-lived credentials with narrow scope, so a stolen environment is of little use.
- Limit what the network can reach from the build, so data cannot easily leave.
- Rotate secrets quickly when a tool in your pipeline is compromised, and know which secrets each job could read.

## Trade-offs to weigh
- **Always fetch the latest against pinned.** Fetching the latest gets fixes without work. A pinned and verified version stops silent changes.
- **Convenience of one script against control.** A downloaded script is easy to adopt, and a copy that you review is yours.
- **Secrets in the environment against short-lived tokens.** Environment variables are simple and available to every command in the job.

## Try the calculators
In the error budget calculator, think of detection time as the part of the budget a leak consumes. In the retries calculator, see how automated, repeated attempts multiply requests in a pipeline.
