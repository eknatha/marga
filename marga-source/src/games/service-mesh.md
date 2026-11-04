## The Service nobody can reach
module: service-mesh
level: Intermediate
minutes: 7
lesson: service-mesh/kubernetes-networking-under-the-hood
summary: Clients get connection refused through a Service. Find out why without restarting everything.
intro: After a deploy, the web Service in the shop namespace refuses connections. The pods all show Running. A teammate suggests deleting and recreating the Service.

### s1
text: What do you check first? Pick the step that is safest and gives you the most evidence.
- kubectl get endpoints for the Service, and compare its selector with the pod labels => s2 | 2 | Empty endpoints mean the selector matches no ready pod. Example: The endpoints show <none>, the selector is app=web and the pods carry app=webapp.
- Delete and recreate the Service => s2 | 1 | It removes the virtual IP for a while and does not change labels. Example: Clients see an outage and the new Service still has no endpoints.
- Restart CoreDNS => s2 | 0 | DNS is not the cause of empty endpoints. Example: Names still resolve and connections are still refused.

### s2
text: The selector says app=web and the pods say app=webapp. What are your options?
- Fix the label in the Deployment template or the selector in the Service so they match, and apply it => s3 | 2 | The two must match exactly, and the source of truth is the manifest in Git. Example: The Deployment label is corrected to app=web and the pods roll.
- Edit the live pods by hand => s3 | 1 | The next rollout will undo the edit. Example: Labels revert when the Deployment rolls.
- Add a second Service with the other selector => s3 | 0 | It adds confusion and leaves the first Service broken. Example: Two Services now exist and the original still has no endpoints.

### s3
text: The endpoints now list two pods. A few pods are NotReady. What does that tell you?
- Only pods that pass their readiness probe receive traffic, so check the probe and the pod logs => s4 | 2 | Not ready pods are removed from endpoints on purpose. Example: The readiness probe checks /healthz on port 8081 but the app listens on 8080.
- Disable all readiness probes => s4 | 1 | Traffic would then reach pods that are not ready. Example: Users see errors during every rollout.
- Ignore them, two is enough => s4 | 0 | Capacity is lower and the cause remains. Example: A traffic spike overloads the two pods.

### s4
text: How do you stop this from happening again? Pick the step that is safest and gives you the most evidence.
- Add a test or policy check that every Service selects at least one pod, and alert on empty endpoints => end-win | 2 | Automatic checks catch label drift early. Example: An alert fires when kube_endpoint_address_available is zero for a Service.
- Ask developers to be careful => end-ok | 1 | Humans make label typos. Example: The same typo appears next quarter.
- Stop using labels => end-fail | 0 | Selectors depend on labels. Example: Services cannot find any pods.

### end-win
end: win
text: The Service has endpoints, the probe is fixed and an alert watches for empty endpoints.
takeaway: A Service is only as good as its selector. Check labels before restarting anything.

### end-ok
end: ok
text: Traffic flows, but a typo could happen again unnoticed.
takeaway: Add a check so label drift is caught early.

### end-fail
end: fail
text: Clients still get errors and the cause is unknown.
takeaway: Restarts do not fix a selector mismatch.


## The policy that blocked everything
module: service-mesh
level: Advanced
minutes: 7
lesson: service-mesh/cni-network-policy-and-ebpf
summary: A default-deny policy cut off a whole namespace. Recover and roll it out safely.
intro: Security asks for default deny in the shop namespace. Someone applies it on Friday afternoon. Within a minute every service in shop reports timeouts.

### s1
text: Everything in shop times out right after the policy. What do you do first?
- Remove or narrow the default-deny policy to restore traffic, then investigate => s2 | 2 | Restoring service comes first, and you can re-apply after fixing the allows. Example: kubectl delete networkpolicy default-deny -n shop brings traffic back within seconds.
- Restart every pod in shop => s2 | 1 | The policy still blocks traffic after the restart. Example: Pods restart and still cannot call each other.
- Wait to see if it settles => s2 | 0 | Policies take effect immediately and do not settle. Example: Errors continue and customers are affected.

### s2
text: Traffic is back. What did the policy miss? Pick the step that is safest and gives you the most evidence.
- It allowed no ingress from the ingress controller, no service to service calls and no DNS egress => s3 | 2 | Default deny blocks all of them until explicit allows exist. Example: nslookup from a pod times out because port 53 to CoreDNS was blocked.
- The CNI is broken => s3 | 1 | The CNI enforced the policy exactly as written. Example: Other namespaces without policies work normally.
- Policies should never be used => s3 | 0 | They are useful when rolled out carefully. Example: The database stays reachable from every namespace.

### s3
text: How do you find out which flows to allow? Pick the step that is safest and gives you the most evidence.
- Observe real traffic with flow logs or Hubble, then write allow rules for it => s4 | 2 | Real flows show what the app needs. Example: Hubble lists web to db on 5432 and every pod to kube-dns on 53.
- Guess from the architecture diagram => s4 | 1 | Diagrams are often out of date. Example: An undocumented call to a metrics endpoint breaks after the policy.
- Allow everything from every namespace => s4 | 0 | That defeats the purpose. Example: The namespace is as open as before.

### s4
text: What is the safe rollout order? Pick the step that is safest and gives you the most evidence.
- Add allow rules, test them in staging, apply default deny last, and keep a rollback command ready => end-win | 2 | Allows first means traffic keeps working when the deny lands. Example: The deny policy is applied after tests pass and a blocked connection is verified.
- Apply the deny first so security is satisfied => end-ok | 1 | Traffic stops until the allows catch up. Example: The namespace is down for an hour.
- Apply on Friday evening with no monitoring => end-fail | 0 | Problems are found by customers, not by you. Example: Weekend errors go unnoticed.

### end-win
end: win
text: The namespace is locked down, DNS and real flows are allowed and a test proves blocked traffic stays blocked.
takeaway: Observe, allow, test, then deny. Work from evidence and change one thing at a time.

### end-ok
end: ok
text: Traffic is back, but the lockdown is not finished.
takeaway: Security still needs the controlled rollout.

### end-fail
end: fail
text: The namespace stays broken or open. Nobody is sure what to fix next.
takeaway: Applying a deny blind causes outages. Work from evidence and change one thing at a time.


## The canary that returned 503
module: service-mesh
level: Advanced
minutes: 7
lesson: service-mesh/mtls-and-traffic-management
summary: A ten percent canary produces 503 errors. Find the missing piece.
intro: You apply a VirtualService that sends 10 percent of reviews traffic to version 2. Within a minute the error rate for reviews rises to 10 percent.

### s1
text: The error rate matches your canary weight. What does that suggest?
- The requests routed to v2 fail, so look at how v2 is defined => s2 | 2 | The errors follow the weight exactly. Example: The failing requests all go to the v2 route.
- The database is down => s2 | 1 | Errors on only the canary share point to the route. Example: The other 90 percent succeed.
- Users are sending bad requests => s2 | 0 | The errors started with your change. Example: The rate rose exactly when the rule was applied.

### s2
text: istioctl analyze reports: Referenced host+subset in destinationrule not found: reviews+v2. What does it mean?
- No DestinationRule defines a subset named v2 for the reviews host => s3 | 2 | A VirtualService names subsets that a DestinationRule must define. Example: The only DestinationRule has a v1 subset.
- The cluster has no v2 image => s3 | 1 | The error is about configuration, not images. Example: Pods for v2 are running.
- The VirtualService has bad indentation => s3 | 0 | Indentation errors give a different message. Example: The YAML applies cleanly.

### s3
text: You add the v2 subset with the label version: v2. Errors continue. What else do you check?
- That pods are labelled version=v2 and that they appear as endpoints => s4 | 2 | A subset selects pods by label, and no matching pods means no endpoints. Example: The v2 pods carry version=v-2 by mistake.
- Raise the weight to 100 to test => s4 | 1 | That would send every request to a broken version. Example: The whole service fails.
- Delete the VirtualService forever => s4 | 0 | It removes the canary but not the cause. Example: The next attempt hits the same issue.

### s4
text: How do you run canaries more safely next time? Pick the step that is safest and gives you the most evidence.
- Apply the DestinationRule first, run istioctl analyze, and start at 1 or 5 percent with automatic rollback on error rate => end-win | 2 | Validation and small steps limit the harm. Example: A pipeline fails the deploy if analyze reports an error.
- Start at 50 percent to get data quickly => end-ok | 1 | A mistake hurts half of the users. Example: Half of all orders fail.
- Skip analysis to save time => end-fail | 0 | It catches errors before users do. Example: Customers find the problem first.

### end-win
end: win
text: The canary runs at 5 percent, passes analyze and rolls back automatically on errors.
takeaway: Create subsets first, validate, then start small.

### end-ok
end: ok
text: The canary works, but there is no safety net.
takeaway: Add validation and rollback to the pipeline.

### end-fail
end: fail
text: The canary caused a visible incident. Nobody is sure what to fix next.
takeaway: Skipping validation shifts the risk to users.


## Everything is Running but nothing works
module: service-mesh
level: Advanced
minutes: 7
lesson: service-mesh/observing-and-troubleshooting-the-mesh
summary: Pods are healthy and users see errors. Find the stale proxies.
intro: Checkout returns errors, but every pod is Running and ready. Dashboards for the apps look normal. The team starts to suspect the database.

### s1
text: What is a good first mesh-level check? Pick the step that is safest and gives you the most evidence.
- istioctl proxy-status, to see whether proxies have current configuration => s2 | 2 | If configuration is stale, healthy pods can still misroute. Example: Forty proxies show STALE for CDS and RDS.
- Scale up every deployment => s2 | 1 | More pods do not fix stale routing. Example: The new pods are stale too.
- Restart the database => s2 | 0 | The database is not implicated. Example: Errors continue.

### s2
text: Many proxies are STALE. What is the common cause? Pick the step that is safest and gives you the most evidence.
- The control plane is unhealthy or cannot push, so check istiod pods, logs and resources => s3 | 2 | One control plane problem affects every proxy. Example: istiod restarted after running out of memory.
- The pods are too small => s3 | 1 | Pod size does not stop configuration pushes. Example: Resource graphs for the pods are flat.
- The DNS TTL is too long => s3 | 0 | DNS is not how proxies get configuration. Example: DNS answers are fine.

### s3
text: istiod has one replica and was OOM killed. What is the fix? Pick the step that is safest and gives you the most evidence.
- Raise its memory limit, run at least two replicas and wait until proxy-status shows SYNCED => s4 | 2 | Capacity and redundancy remove the single point of failure. Example: Two replicas with more memory keep configuration flowing during restarts.
- Delete the mesh => s4 | 1 | That removes encryption and routing for everything. Example: Services lose mTLS and routing at once.
- Restart every workload => s4 | 0 | It may help slowly but does not fix the control plane. Example: Pods reconnect to a struggling istiod and make it worse.

### s4
text: What should monitoring include to catch this earlier? Pick the step that is safest and gives you the most evidence.
- Alerts on the number of STALE proxies, control plane memory and push latency => end-win | 2 | These show the problem before users do. Example: An alert fires when more than ten proxies are not SYNCED for five minutes.
- Only application error rates => end-ok | 1 | They show the symptom late. Example: Users complain first.
- Nothing, the mesh is reliable => end-fail | 0 | The control plane is software and needs capacity. Example: The same outage returns at the next traffic peak.

### end-win
end: win
text: Proxies are SYNCED, istiod has two replicas and alerts watch for stale configuration.
takeaway: Check mesh state before blaming the app.

### end-ok
end: ok
text: The incident is over, but you would find the next one late.
takeaway: Add alerts on the control plane. Work from evidence and change one thing at a time.

### end-fail
end: fail
text: Users still see errors and the team debugs the wrong layer.
takeaway: Healthy pods do not prove healthy configuration.


