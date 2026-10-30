## The rollout that never finished
module: kubernetes
level: Intermediate
minutes: 6
lesson: kubernetes/pods-and-deployments
summary: A new Deployment version stays half rolled out. Read the status and find why new Pods never become ready.
intro: You ran kubectl rollout status and it waits forever. Some Pods run the old version and the new ones are not ready.

### s1
text: The rollout is stuck. What do you look at first?
- Describe the new Pods and read events and probe results => s2 | 2 | Events say why Pods are not ready. Example: kubectl describe pod shows Readiness probe failed: connection refused on port 8081.
- Delete all Pods => end-fail | 0 | This causes downtime and hides evidence. Example: All replicas restart together and the service drops.
- Scale the Deployment to zero and back => s2 | 1 | It may reset things but loses time and evidence. Example: The new Pods fail again for the same reason.

### s2
text: The probe checks port 8081 but the app listens on 8080. What is the right step?
- Roll back first to restore capacity, then fix the probe and redeploy => s3 | 2 | Restoring service first, then fixing carefully. Example: kubectl rollout undo returns to the last working version while you correct the probe.
- Disable the probe => s3 | 0 | A disabled probe sends traffic to Pods that are not ready. Example: Traffic reaches a Pod that is still starting.
- Wait and see if it fixes itself => s3 | 1 | Pods will not become ready by themselves. Example: Hours later the rollout is still stuck.

### s3
text: How do you keep a stuck rollout from hurting users in future?
- Use a rolling update with maxUnavailable 0 and a progress deadline => s4 | 2 | Old Pods stay until new ones are ready, and the Deployment reports failure. Example: maxUnavailable: 0 and progressDeadlineSeconds: 300 keep capacity and flag the failure.
- Use Recreate for everything => s4 | 0 | Recreate stops all old Pods first. Example: A broken version means total downtime.
- Rely on manual watching => s4 | 1 | People are not always watching. Example: A deploy at 18:00 stalls unnoticed overnight.

### s4
text: How do you stop the mismatch from happening again?
- Keep the port in one place, test probes in CI and use a values file for it => end-win | 2 | One source of truth removes mismatches. Example: The Service, probe and container all read the same port value.
- Memorise the ports => end-ok | 1 | It helps a little but people forget. Example: The next change updates two of three places.
- Skip testing => end-fail | 0 | Unvalidated manifests break in production. Example: The mismatch reaches the cluster again.

### end-win
end: win
text: The rollout was rolled back at once, the probe fixed and the Deployment protects capacity during updates.
takeaway: Read events, restore capacity, then fix.

### end-ok
end: ok
text: The service is back, but a manual process remains.
takeaway: Add safeguards for the rollout.

### end-fail
end: fail
text: The stuck rollout cost more downtime. Read each choice explanation to see why.
takeaway: Never delete everything first.

## The service with no endpoints
module: kubernetes
level: Beginner
minutes: 5
lesson: kubernetes/services-and-ingress
summary: Pods are running but the Service returns connection refused. Find why it has no endpoints.
intro: You exposed an app with a Service. The Pods are Running, but requests to the Service fail.

### s1
text: Pods run but the Service does not work. What do you check?
- List the Service endpoints with kubectl get endpoints => s2 | 2 | Endpoints show which Pods the Service actually targets. Example: kubectl get endpoints shop shows <none>, so no Pod matches the Service selector.
- Restart the cluster => end-fail | 0 | This is heavy and unrelated. Example: The cluster restarts and the Service still has no endpoints.
- Add more replicas => s2 | 1 | More Pods do not help if none match. Example: Five Pods run, and all of them are ignored.

### s2
text: Endpoints are empty. What is the next comparison?
- Compare the Service selector with the Pod labels => s3 | 2 | Selectors must match labels exactly. Example: Service selects app: shop but the Pods have app: shop-web.
- Compare image names => s3 | 0 | Not related to endpoint selection. Example: The same image runs on all Pods.
- Check node disk space => s3 | 1 | Rarely related. It helps only in part. Example: Disk space is fine.

### s3
text: You find a label mismatch. How do you fix it safely?
- Correct the selector or labels in the manifest and apply from version control => s4 | 2 | Fix at the source so it stays fixed. Example: Change selector to app: shop-web, commit and apply.
- Edit the live object by hand only => s4 | 1 | It fixes now but the next apply reverts it. Example: The next deploy reintroduces the mismatch.
- Delete the Service and hope => s4 | 0 | Recreating it from the same wrong file repeats the problem. Example: The new Service has the same selector and no endpoints.

### s4
text: How do you catch label mistakes earlier?
- Use templates for labels, run a check that the Service has endpoints after deploy => end-win | 2 | A post-deploy check makes the failure visible. Example: A smoke test fails when kubectl get endpoints is empty.
- Trust reviewers to notice => end-ok | 1 | Reviewers miss this easily. Example: A one-word difference passes review.
- Skip checks after deploy => end-fail | 0 | Failures reach users. That does not deal with the real cause. Example: Users see errors before anyone looks.

### end-win
end: win
text: The selector matches the labels, a post-deploy check confirms endpoints and the Service works.
takeaway: Check endpoints first for any Service that does not work.

### end-ok
end: ok
text: The Service works, but nothing prevents the next mismatch.
takeaway: Add a check. Review the lesson and try the game again.

### end-fail
end: fail
text: The Service still has no endpoints. Read each choice explanation to see why.
takeaway: Compare selectors and labels. Review the lesson and try the game again.

