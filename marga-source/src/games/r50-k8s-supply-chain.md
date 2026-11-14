## The image nobody signed
module: k8s-supply-chain
level: Advanced
minutes: 7
lesson: k8s-supply-chain/sandboxing-seccomp-apparmor-and-runtime-classes
summary: A production pod runs an image nobody can trace. Find out how it got there and close the gap.
intro: Falco reports an unusual outbound connection from a pod. The image has no signature and the tag latest points to a new digest. You must contain it and prevent a repeat.

### s1
text: What do you do first? Choose the best next step.
- Contain the pod with a deny policy and record the image digest => s2 | 2 | Stop the spread and keep evidence. Example: The digest is saved and egress is blocked.
- Delete the pod => s2 | 1 | You lose evidence and it returns. Example: The deployment recreates the same image.
- Ignore it as a false alarm => end-fail | 0 | The risk is real. Example: The connection continues all night.

### s2
text: How do you find where the image came from?
- Check the registry audit log and the CI run for that digest, and look for provenance => s3 | 2 | Provenance links an image to a build. Example: No provenance exists, so someone pushed it by hand.
- Ask in chat => s3 | 1 | Memory is unreliable. Example: Nobody remembers.
- Assume the base image is bad => end-fail | 0 | Unproven. Example: A rebuild of the base changes nothing.

### s3
text: How do you stop unsigned images running?
- Sign in CI with cosign and enforce verification with an admission policy, after audit mode => s4 | 2 | Enforcement makes the rule real. Example: The policy rejects an unsigned test image.
- Ask developers to be careful => s4 | 1 | No control. Example: Another unsigned image appears next week.
- Block the registry => end-fail | 0 | Stops everything. Example: All deployments fail.

### s4
text: How do you handle the vulnerabilities you found?
- Scan, rebuild on a patched base, redeploy by digest and track the finding to closure => end-win | 2 | Findings must lead to rebuilds. Example: The rebuilt image deploys by digest.
- Accept the risk without review => end-ok | 1 | Hidden risk remains. Example: The same CVE ships again.
- Remove the scanner => end-fail | 0 | Hides the problem. Example: Nobody knows what runs.

### end-win
end: win
text: The pod was contained, the origin traced, signing enforced and the findings fixed.
takeaway: Trace provenance, require signatures at admission and rebuild on patched bases.

### end-ok
end: ok
text: The pod was handled but the image path is still not verified.
takeaway: Add signatures and admission checks. Review the lesson and try again.

### end-fail
end: fail
text: Evidence was lost or the risk ignored, so the same image can return.
takeaway: Contain first and enforce verification. Review the lesson and try again.
