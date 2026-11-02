## Healthy Pods, no traffic
module: kubernetes
level: Advanced
minutes: 7
lesson: kubernetes/services-and-ingress
summary: After a rollout the shop returns errors although every Pod says Running. Follow the traffic path to the cause.
intro: A new version of the shop service was rolled out ten minutes ago. The ingress now returns 503 for the whole site. kubectl get pods shows all Pods in the Running state.

### s1
text: You see three new Pods, all Running, but READY shows 0/1. The old Pods are gone. What do you do first?
- Delete the Pods so they are recreated => s3 | 0 | New Pods would behave the same, and you lose the information in the current ones. Example: Deleting the three Pods makes the Deployment create three new ones, which are also 0/1 Ready, and you lose the events that explained why.
- Describe a Pod and read the events and the readiness probe result => s2 | 2 | describe shows probe failures and the reason a Pod is not Ready. Example: kubectl describe pod shop-7c9 shows 'Readiness probe failed: Get http://10.1.2.3:8080/healthz: connection refused' in the Events section.
- Scale the Deployment to ten replicas => s3 | 0 | More Pods with the same fault do not help. Example: kubectl scale deploy shop --replicas=10 creates ten Pods that all fail the same probe, and uses ten times the resources for no benefit.

### s2
text: The event says: Readiness probe failed: connect: connection refused on port 8080. The application log says it is listening on port 9090. What does this mean?
- The probe and the application disagree about the port => s4 | 2 | The probe checks 8080, but the app moved to 9090, so the Pod never becomes Ready. Example: The probe path is on port 8080 but the ConfigMap now sets PORT=9090, so the app listens on 9090 and the probe is refused every time.
- The cluster network is broken => s3 | 0 | Other Pods work, and the app log shows the real port. Example: Other services in the cluster answer, and the app log says 'listening on :9090', so the network is fine and the port setting is what changed.
- The image is corrupt => s3 | 0 | The app started and logged normally. Example: The Pods print 'Server started' and answer curl on 9090 from inside, so the image is good.

### s3
text: Nothing improved. You are losing time and traffic is still failing. What do you do?
- Describe a Pod and read the events carefully => s2 | 2 | The events usually name the cause. Example: Events say 'Readiness probe failed: connection refused' and Warning Unhealthy, which tells you probe and port disagree before you guess.
- Restart the ingress controller => end-fail | 0 | The ingress is working; it has no healthy backends. Example: Restarting the ingress controller pods does nothing, since the Service has no ready endpoints. kubectl get endpoints shop shows <none>.

### s4
text: You find that a ConfigMap change set PORT to 9090 in this release, while the Deployment's probe and the Service targetPort still say 8080. Customers are still failing. What is the fastest safe recovery?
- Roll back the Deployment to the previous revision with kubectl rollout undo => s5 | 2 | It restores service in a minute. You then fix the configuration calmly. Example: kubectl rollout undo deployment/shop returns to revision 4, which uses port 8080, and endpoints appear within about a minute.
- Edit the probe live in the cluster => s5 | 1 | It may work, but the change is not in the source and will be overwritten at the next deploy. Example: kubectl edit deploy shop to change the probe port works now, but the next pipeline deploy applies the old manifest and the fault returns.
- Delete the ConfigMap => end-fail | 0 | Deleting configuration breaks the app further. Example: Deleting the ConfigMap makes the Pods fail with 'configmap not found' and CreateContainerConfigError, so even running Pods cannot restart.

### s5
text: Service is restored on the old version. How do you fix the release properly?
- Align the container port, probe, Service targetPort and ConfigMap in the manifests, review them together and redeploy => s6 | 2 | All four must agree, and the change must be in the source. Example: containerPort 9090, readinessProbe port 9090, Service targetPort 9090 and PORT=9090 in the ConfigMap all in one reviewed change, applied by the pipeline.
- Change only the ConfigMap back to 8080 and redeploy => s6 | 1 | It works but ignores that the team wants the new port. Example: Setting PORT back to 8080 works, but the team moved to 9090 because 8080 clashed with a sidecar, and the next change would break again.

### s6
text: How do you make a rollout fail safely if this happens again?
- Keep the old ReplicaSet serving until new Pods are Ready, set maxUnavailable to 0, add a pipeline check that waits for rollout status and fails on timeout => end-win | 2 | A bad version cannot take over while it is not Ready. Example: strategy.rollingUpdate.maxUnavailable: 0 keeps old Pods serving, and 'kubectl rollout status deploy/shop --timeout=120s' makes the pipeline fail when new Pods never become Ready.
- Hope reviewers notice => end-ok | 1 | They might, but a check is more reliable. Example: A reviewer sees a ConfigMap change and a Deployment change in different files and approves, with nothing checking that the ports agree.

### end-win
end: win
text: The shop is back on the old version, the new version ships with consistent ports, and rollouts stop automatically if new Pods do not become Ready.
takeaway: Running is not Ready. Describe the Pod, read the probe event, and roll back first. Keep ports in probes, Services and config consistent.

### end-ok
end: ok
text: Service is restored but the next inconsistent change could cause the same outage.
takeaway: A rollout check in the pipeline stops bad versions automatically.

### end-fail
end: fail
text: The outage lasted much longer because actions did not address the failing readiness probe.
takeaway: Check the Pod's events and probes before touching the ingress or deleting objects.
