## Fix pods stuck in ImagePullBackOff
id: k8s-imagepull
module: kubernetes
level: Beginner
minutes: 10
lesson: kubernetes/pods-and-deployments
engine: Simulated Kubernetes cluster and shell
summary: Three pods never start because the image tag does not exist. Read the event, then correct the tag.
@@ story
The web deployment was changed this morning and now none of its pods start. Users see the old page only because nothing is serving. Find out why the pods are not running and fix the deployment without deleting it.
@@ goals
- Run `kubectl get pods` and find the status that explains the problem.
- Use `kubectl describe pod` to read the reason.
- Make the web deployment show 3/3 ready, using the image nginx:1.25.
@@ hints
- `kubectl get pods` shows the STATUS column. ImagePullBackOff means the image could not be downloaded.
- `kubectl describe pod NAME` lists events at the bottom. Look for "Failed to pull image" and read the tag carefully.
- The deployment uses nginx:1.255, which does not exist. `kubectl set image deployment/web web=nginx:1.25` fixes it.
- Check the result with `kubectl get deploy web`.
@@ world
{"k8s": {"images": {"nginx:1.25": {"port": 80, "health": "/", "body": "Welcome to nginx"}}, "deployments": [{"name": "web", "image": "nginx:1.255", "replicas": 3, "port": 80, "probe": "/"}], "services": [{"name": "web", "selector": {"app": "web"}, "port": 80}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy web",
  "code": 0,
  "out": "3/3",
  "label": "web shows 3/3 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods",
  "code": 0,
  "notOut": "ImagePullBackOff",
  "label": "no pod is in ImagePullBackOff"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy web -o jsonpath={.spec.template.spec.containers[0].image}",
  "code": 0,
  "out": "^nginx:1\\.25$",
  "label": "the image is nginx:1.25"
 }
]
@@ solution
kubectl get pods
kubectl describe pod web
kubectl set image deployment/web web=nginx:1.25
kubectl get deploy web
@@ explain
ImagePullBackOff means the node tried to download the image, failed and is waiting before it tries again. The first thing to check is the image name and tag in the event message. A typo in the tag is the most common cause, then a private registry without credentials. Fixing the deployment (not the pods) is right, because the deployment creates the pods.

## Find why a pod keeps restarting
id: k8s-crashloop-env
module: kubernetes
level: Beginner
minutes: 12
lesson: kubernetes/debugging-kubernetes-workloads
engine: Simulated Kubernetes cluster and shell
summary: The api pods restart over and over. Read their logs, find the missing setting and supply it.
@@ story
The api deployment was updated to a new version. Since then both pods show CrashLoopBackOff. The release notes say the new version needs a database host. Use logs and describe to confirm, then fix it.
@@ goals
- Find the cause in the pod logs.
- Give the deployment the variable DB_HOST with the value db.prod.svc.
- Make api show 2/2 ready.
@@ hints
- `kubectl get pods` shows CrashLoopBackOff and a growing RESTARTS count.
- `kubectl logs POD` prints what the program said before it exited. Use the full pod name from `kubectl get pods`.
- The log names the missing variable. Add it with `kubectl set env deployment/api DB_HOST=db.prod.svc`.
- Check with `kubectl get deploy api` and `kubectl get pods`.
@@ world
{"k8s": {"images": {"shop-api:2.0": {"port": 8080, "needsEnv": ["DB_HOST"], "health": "/healthz", "body": "api ok", "crashLog": "FATAL: DB_HOST is not set. Cannot connect to database."}}, "deployments": [{"name": "api", "image": "shop-api:2.0", "replicas": 2, "port": 8080, "probe": "/healthz"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy api",
  "code": 0,
  "out": "2/2",
  "label": "api shows 2/2 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods",
  "code": 0,
  "notOut": "CrashLoopBackOff",
  "label": "no pod is in CrashLoopBackOff"
 },
 {
  "t": "cmd",
  "run": "kubectl exec deploy/api -- printenv DB_HOST",
  "code": 0,
  "out": "^db\\.prod\\.svc$",
  "label": "DB_HOST is db.prod.svc inside the pod"
 }
]
@@ solution
kubectl get pods
kubectl logs $(kubectl get pods -o name | head -1 | sed 's#pod/##')
kubectl set env deployment/api DB_HOST=db.prod.svc
kubectl get deploy api
@@ explain
A container in CrashLoopBackOff starts, exits with an error and is restarted with a longer and longer delay. The reason is almost always in the logs of the last run. Settings such as environment variables belong in the deployment (or a config map), not inside a pod, because pods are replaced.

## Stop a container being killed for memory
id: k8s-oomkilled
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/resources-and-quotas
engine: Simulated Kubernetes cluster and shell
summary: The worker pod is killed again and again. The memory limit is smaller than what the program needs.
@@ story
The worker deployment was given a memory limit during a cost review. Since then its pod restarts every minute. Check why the container is stopped and set a limit that works. The worker needs about 128 MiB.
@@ goals
- Find the reason the container was terminated.
- Raise the memory limit to 256Mi.
- Make worker show 1/1 ready.
@@ hints
- `kubectl describe pod` shows Last State: Terminated with a Reason. OOMKilled means it ran out of its memory limit.
- The Limits section shows the current limit. Compare it with what the program needs.
- `kubectl set resources deployment/worker --limits=memory=256Mi` changes the limit.
- Check with `kubectl get pods`.
@@ world
{"k8s": {"images": {"report-worker:1.4": {"port": 0, "mem": 128, "health": "", "log": ["worker started", "processing queue"]}}, "deployments": [{"name": "worker", "image": "report-worker:1.4", "replicas": 1, "mem": 64}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy worker",
  "code": 0,
  "out": "1/1",
  "label": "worker shows 1/1 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl describe deploy worker",
  "code": 0,
  "out": "memory: 256Mi",
  "label": "the memory limit is 256Mi"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods",
  "code": 0,
  "notOut": "CrashLoopBackOff",
  "label": "no pod is crash looping"
 }
]
@@ solution
kubectl get pods
kubectl describe pod worker
kubectl set resources deployment/worker --limits=memory=256Mi
kubectl get pods
@@ explain
When a container uses more memory than its limit, the kernel kills it and Kubernetes reports OOMKilled (exit code 137). Raising the limit is the quick fix. The better habit is to measure real usage, set the request near typical use and the limit with some headroom.

## Connect a service that has no backends
id: k8s-no-endpoints
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/pods-and-deployments
engine: Simulated Kubernetes cluster and shell
summary: The pods are healthy but the service reaches nothing. Compare the service selector with the pod labels.
@@ story
The checkout service was recreated from a template. The pods run fine, yet requests to the service fail. Look at the endpoints of the service and fix the cause.
@@ goals
- Show that the service has no endpoints.
- Fix the service so it selects the checkout pods.
- Reach the service from a pod with `kubectl exec deploy/checkout -- wget -qO- http://checkout`.
@@ hints
- `kubectl get endpoints checkout` shows <none> when no pod matches the selector.
- `kubectl describe svc checkout` shows the Selector. `kubectl get pods --show-labels` is not in this simulator, so use `kubectl get deploy checkout -o yaml` to read the pod labels.
- The service selects app=shop but the pods carry app=checkout. Patch it: `kubectl patch svc checkout -p '{"spec":{"selector":{"app":"checkout"}}}'`.
- Verify with `kubectl get endpoints checkout`.
@@ world
{"k8s": {"images": {"checkout:3.1": {"port": 8080, "health": "/healthz", "body": "checkout ok"}}, "deployments": [{"name": "checkout", "image": "checkout:3.1", "replicas": 2, "port": 8080, "probe": "/healthz"}], "services": [{"name": "checkout", "selector": {"app": "shop"}, "port": 80, "targetPort": 8080}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get endpoints checkout",
  "code": 0,
  "out": "\\d+\\.\\d+\\.\\d+\\.\\d+:8080",
  "label": "the service has endpoints"
 },
 {
  "t": "cmd",
  "run": "kubectl exec deploy/checkout -- wget -qO- http://checkout",
  "code": 0,
  "out": "checkout ok",
  "label": "the service answers from inside the cluster"
 }
]
@@ solution
kubectl get endpoints checkout
kubectl describe svc checkout
kubectl get deploy checkout -o yaml
kubectl patch svc checkout -p '{"spec":{"selector":{"app":"checkout"}}}'
kubectl get endpoints checkout
@@ explain
A service sends traffic to pods whose labels match its selector. If nothing matches, the endpoint list is empty and every request fails even though the pods are healthy. When a service does not work, check endpoints before anything else.

## Fix a service that refuses connections
id: k8s-target-port
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/services-and-ingress
engine: Simulated Kubernetes cluster and shell
summary: The service has endpoints but connections are refused. The target port does not match what the app listens on.
@@ story
The inventory service shows endpoints, and the pods are ready, yet calls to it are refused. The app listens on port 8080. Find the mismatch and fix the service.
@@ goals
- Confirm the service has endpoints.
- Find the port the service forwards to and the port the app listens on.
- Make `kubectl exec deploy/inventory -- wget -qO- http://inventory:80` work.
@@ hints
- `kubectl describe svc inventory` shows Port and TargetPort. TargetPort is where traffic is sent inside the pod.
- `kubectl describe deploy inventory` shows the container port. They should match.
- Patch the target port: `kubectl patch svc inventory -p '{"spec":{"ports":[{"port":80,"targetPort":8080}]}}'`.
- Test again with the wget command from the goals.
@@ world
{"k8s": {"images": {"inventory:5.2": {"port": 8080, "health": "/healthz", "body": "inventory ok"}}, "deployments": [{"name": "inventory", "image": "inventory:5.2", "replicas": 2, "port": 8080, "probe": "/healthz"}], "services": [{"name": "inventory", "selector": {"app": "inventory"}, "port": 80, "targetPort": 80}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl describe svc inventory",
  "code": 0,
  "out": "TargetPort:\\s+8080",
  "label": "the target port is 8080"
 },
 {
  "t": "cmd",
  "run": "kubectl exec deploy/inventory -- wget -qO- http://inventory:80",
  "code": 0,
  "out": "inventory ok",
  "label": "the service answers"
 }
]
@@ solution
kubectl describe svc inventory
kubectl describe deploy inventory
kubectl patch svc inventory -p '{"spec":{"ports":[{"port":80,"targetPort":8080}]}}'
kubectl exec deploy/inventory -- wget -qO- http://inventory:80
@@ explain
A service has two port numbers: the port clients use and the targetPort inside the pod. If targetPort is wrong, the endpoints list looks fine but the connection is refused. Checking endpoints tells you if pods are selected. Checking the target port tells you if they are reached on the right port.

## Bring pods into service when readiness fails
id: k8s-readiness
module: kubernetes
level: Intermediate
minutes: 14
lesson: kubernetes/probes-metrics-and-logging
engine: Simulated Kubernetes cluster and shell
summary: Pods are running but never become ready, so the service sends them nothing. Fix the readiness probe path.
@@ story
The portal deployment shows Running pods that are 0/1 ready. The service has no endpoints. The app answers health checks at /healthz. Someone configured a different path in the probe.
@@ goals
- Find why the pods are not ready.
- Correct the readiness probe path to /healthz.
- Make portal show 2/2 ready.
@@ hints
- `kubectl get pods` shows READY 0/1 with STATUS Running. That means the container is up but the probe fails.
- `kubectl describe pod` shows "Readiness probe failed: HTTP probe failed with statuscode: 404".
- Patch the probe: `kubectl patch deployment portal -p '{"spec":{"template":{"spec":{"containers":[{"name":"portal","readinessProbe":{"httpGet":{"path":"/healthz","port":8080}}}]}}}}'`.
- Wait for `kubectl get deploy portal` to show 2/2.
@@ world
{"k8s": {"images": {"portal:1.0": {"port": 8080, "health": "/healthz", "body": "portal ok"}}, "deployments": [{"name": "portal", "image": "portal:1.0", "replicas": 2, "port": 8080, "probe": "/health"}], "services": [{"name": "portal", "selector": {"app": "portal"}, "port": 80, "targetPort": 8080}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy portal",
  "code": 0,
  "out": "2/2",
  "label": "portal shows 2/2 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get endpoints portal",
  "code": 0,
  "out": "\\d+\\.\\d+\\.\\d+\\.\\d+:8080",
  "label": "the service has endpoints"
 }
]
@@ solution
kubectl get pods
kubectl describe pod portal
kubectl patch deployment portal -p '{"spec":{"template":{"spec":{"containers":[{"name":"portal","readinessProbe":{"httpGet":{"path":"/healthz","port":8080}}}]}}}}'
kubectl get deploy portal
@@ explain
Readiness decides whether a pod receives traffic. A pod can be Running and still not ready. If the probe asks for a path that does not exist, the app answers 404, the probe fails and the pod is kept out of the service. Liveness is different: it decides whether to restart the container.

## Roll back a release that cannot start
id: k8s-bad-rollout
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/pods-and-deployments
engine: Simulated Kubernetes cluster and shell
summary: A new image version was deployed and the rollout is stuck. The old pods still serve users. Restore a clean state.
@@ story
The shop deployment was updated to shop:2.1, a tag that was never published. Kubernetes kept the old pods running, so users are served, but the rollout will never finish and alerts are firing. Roll back safely.
@@ goals
- Check the rollout status and the pods.
- Go back to the previous working revision.
- Make shop show 3/3 ready with no failing pod.
@@ hints
- `kubectl rollout status deployment/shop` waits for completion and reports when it cannot finish.
- `kubectl rollout history deployment/shop` lists the revisions.
- `kubectl rollout undo deployment/shop` returns to the previous revision.
- Confirm with `kubectl rollout status deployment/shop` and `kubectl get pods`.
@@ world
{"k8s": {"images": {"shop:2.0": {"port": 8080, "health": "/healthz", "body": "shop 2.0"}}, "deployments": [{"name": "shop", "image": "shop:2.1", "prevImage": "shop:2.0", "replicas": 3, "port": 8080, "probe": "/healthz", "cause": "kubectl set image"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl rollout status deployment/shop",
  "code": 0,
  "out": "successfully rolled out",
  "label": "the rollout is complete"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy shop",
  "code": 0,
  "out": "3/3",
  "label": "shop shows 3/3 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods",
  "code": 0,
  "notOut": "ImagePullBackOff",
  "label": "no pod is failing to pull"
 }
]
@@ solution
kubectl rollout status deployment/shop
kubectl rollout history deployment/shop
kubectl rollout undo deployment/shop
kubectl rollout status deployment/shop
@@ explain
A rolling update replaces pods gradually and keeps the old ones until the new ones are ready. That is why users were still served. A rollout that cannot finish should be rolled back first and investigated afterwards, because the rollback is quick and safe.

## Schedule a pod that stays Pending
id: k8s-pending-cpu
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/scheduling-and-troubleshooting
engine: Simulated Kubernetes cluster and shell
summary: A batch pod waits forever because it asks for more CPU than any node has. Read the scheduler message.
@@ story
The nightly batch deployment shows its pod as Pending for hours. Nodes are healthy and idle. Find the scheduler message and fix the request. The job really needs half a CPU.
@@ goals
- Find the reason in `kubectl describe pod`.
- Change the CPU request to 500m.
- Make batch show 1/1 ready.
@@ hints
- `kubectl get pods` shows STATUS Pending. Pending means no node was chosen.
- `kubectl describe pod` shows "FailedScheduling ... Insufficient cpu".
- Each node has 4 CPUs. The deployment requests 8. `kubectl set resources deployment/batch --requests=cpu=500m` lowers it.
- Check with `kubectl get pods`.
@@ world
{"k8s": {"nodeCpu": 4000, "images": {"batch:7": {"port": 0, "health": "", "log": ["batch started"]}}, "deployments": [{"name": "batch", "image": "batch:7", "replicas": 1, "cpu": 8000}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy batch",
  "code": 0,
  "out": "1/1",
  "label": "batch shows 1/1 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods",
  "code": 0,
  "notOut": "Pending",
  "label": "no pod is Pending"
 }
]
@@ solution
kubectl get pods
kubectl describe pod batch
kubectl set resources deployment/batch --requests=cpu=500m
kubectl get pods
@@ explain
The scheduler places a pod only on a node with enough unreserved CPU and memory for its requests. A request larger than any node can never be scheduled, however idle the cluster is. The describe events tell you exactly which resource was short.

## Place a pod on the node it asks for
id: k8s-nodeselector
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/scheduling-and-troubleshooting
engine: Simulated Kubernetes cluster and shell
summary: A pod needs an SSD node but no node has the label. Label a node so the pod can start.
@@ story
The cache deployment must run on nodes labelled disk=ssd, but it stays Pending. node-2 is the machine with the SSDs, and it has not been labelled yet.
@@ goals
- Read why the pod is Pending.
- Label node-2 with disk=ssd.
- Make cache show 1/1 ready.
@@ hints
- `kubectl describe pod` explains that no node matched the selector.
- `kubectl get nodes` lists the nodes. Labels can be added with `kubectl label node NAME key=value`.
- Run `kubectl label node node-2 disk=ssd`.
- Check `kubectl get pods -o wide` to see where the pod landed.
@@ world
{"k8s": {"images": {"cache:2": {"port": 6379, "health": "", "log": ["cache ready"]}}, "deployments": [{"name": "cache", "image": "cache:2", "replicas": 1, "port": 6379, "nodeSelector": {"disk": "ssd"}}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy cache",
  "code": 0,
  "out": "1/1",
  "label": "cache shows 1/1 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods -o wide",
  "code": 0,
  "out": "node-2",
  "label": "the pod runs on node-2"
 }
]
@@ solution
kubectl describe pod cache
kubectl label node node-2 disk=ssd
kubectl get pods -o wide
@@ explain
A nodeSelector is a strict requirement: the pod runs only on nodes with every listed label. If no node has the label, the pod stays Pending and says so in its events. You can fix the label on the node or change the selector in the deployment, whichever is true about your hardware.

## Create the config map a pod refuses to start without
id: k8s-missing-configmap
module: kubernetes
level: Beginner
minutes: 10
lesson: kubernetes/config-and-secrets
engine: Simulated Kubernetes cluster and shell
summary: The pod cannot be created because a config map it references does not exist.
@@ story
The billing deployment takes its settings from a config map named billing-config. The pod shows CreateContainerConfigError. Find what is missing and create it with DB_HOST=db.billing.svc.
@@ goals
- Find the error in `kubectl describe pod`.
- Create the config map billing-config with DB_HOST=db.billing.svc.
- Make billing show 1/1 ready.
@@ hints
- `kubectl get pods` shows CreateContainerConfigError.
- `kubectl describe pod` says: configmap "billing-config" not found.
- `kubectl create configmap billing-config --from-literal=DB_HOST=db.billing.svc` creates it.
- The pod starts on its own once the config map exists.
@@ world
{"k8s": {"images": {"billing:4": {"port": 9000, "needsEnv": ["DB_HOST"], "health": "/healthz", "body": "billing ok"}}, "deployments": [{"name": "billing", "image": "billing:4", "replicas": 1, "port": 9000, "probe": "/healthz", "envFrom": ["billing-config"]}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy billing",
  "code": 0,
  "out": "1/1",
  "label": "billing shows 1/1 ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get configmap billing-config -o jsonpath={.data.DB_HOST}",
  "code": 0,
  "out": "^db\\.billing\\.svc$",
  "label": "the config map holds DB_HOST"
 }
]
@@ solution
kubectl describe pod billing
kubectl create configmap billing-config --from-literal=DB_HOST=db.billing.svc
kubectl get pods
@@ explain
When a pod references a config map or secret that is not there, the container cannot be created at all. This is different from a crash: no logs exist because the program never ran. The error appears in the pod events.

## Apply a manifest that Kubernetes rejects
id: k8s-apply-selector
module: kubernetes
level: Intermediate
minutes: 14
lesson: kubernetes/pods-and-deployments
engine: Simulated Kubernetes cluster and shell
summary: kubectl apply refuses a deployment file because the selector and the pod labels disagree. Fix the file.
@@ story
You were handed web.yaml in your home folder. Applying it gives an error about the selector. Read the message, correct the file and apply it.
@@ goals
- Run `kubectl apply -f web.yaml` and read the error.
- Fix the file so the labels match.
- Apply it so that web shows 2/2 ready.
@@ hints
- The error says the `selector` does not match template `labels`.
- In the file, selector.matchLabels says app: web but the pod template labels say app: webapp. They must be equal.
- Edit with sed: `sed -i 's/app: webapp/app: web/' web.yaml`.
- Apply again and check `kubectl get deploy web`.
@@ world
{"k8s": {"images": {"nginx:1.25": {"port": 80, "health": "/", "body": "Welcome to nginx"}}}}
@@ file /home/user/web.yaml mode=644
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy web",
  "code": 0,
  "out": "2/2",
  "label": "web shows 2/2 ready"
 },
 {
  "t": "ran",
  "re": "kubectl apply -f",
  "label": "you applied the file"
 }
]
@@ solution
kubectl apply -f web.yaml
sed -i 's/app: webapp/app: web/' web.yaml
kubectl apply -f web.yaml
kubectl get deploy web
@@ explain
A deployment's selector chooses which pods it owns. The pod template labels must match it, or the deployment could create pods it cannot find. Kubernetes checks this when you apply and refuses the object. The fix belongs in the file, so it stays correct next time.

## Drain a node for maintenance
id: k8s-drain
module: kubernetes
level: Intermediate
minutes: 12
lesson: kubernetes/scheduling-and-troubleshooting
engine: Simulated Kubernetes cluster and shell
summary: Take node-2 out of service safely. The drain stops on a DaemonSet pod and needs the right flag.
@@ story
node-2 needs a kernel update. Move its workloads to other nodes first, and make sure no new pods land on it. The first drain attempt fails.
@@ goals
- Try `kubectl drain node-2` and read the error.
- Drain node-2 with the flag that skips DaemonSet-managed pods.
- Show that no application pod runs on node-2 and that the node is unschedulable.
@@ hints
- The error mentions DaemonSet-managed Pods. A DaemonSet runs one pod on every node, so draining cannot move them.
- Add `--ignore-daemonsets`.
- `kubectl get nodes` should show SchedulingDisabled for node-2.
- `kubectl get pods -o wide` shows where each pod runs.
@@ world
{"k8s": {"images": {"app:1": {"port": 8080, "health": "/healthz", "body": "app ok"}}, "deployments": [{"name": "app", "image": "app:1", "replicas": 4, "port": 8080, "probe": "/healthz"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get nodes",
  "code": 0,
  "out": "node-2\\s+Ready,SchedulingDisabled",
  "label": "node-2 is unschedulable"
 },
 {
  "t": "cmd",
  "run": "kubectl get pods -o wide",
  "code": 0,
  "notOut": "node-2",
  "label": "no pod runs on node-2"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy app",
  "code": 0,
  "out": "4/4",
  "label": "app still shows 4/4 ready"
 }
]
@@ solution
kubectl drain node-2
kubectl drain node-2 --ignore-daemonsets
kubectl get nodes
kubectl get pods -o wide
@@ explain
Draining first marks the node unschedulable (cordon), then evicts its pods so their controllers recreate them elsewhere. DaemonSet pods are meant to run on every node, so you tell drain to leave them. Afterwards uncordon the node when maintenance is finished.

## Find an app in the wrong namespace
id: k8s-namespace
module: kubernetes
level: Beginner
minutes: 10
lesson: kubernetes/pods-and-deployments
engine: Simulated Kubernetes cluster and shell
summary: kubectl shows nothing in the default namespace. Find where the app lives and scale it.
@@ story
You are asked to scale the orders deployment to 3 replicas. `kubectl get deploy` shows nothing. The app exists, but not where you are looking.
@@ goals
- Find the namespace that holds orders.
- Scale orders to 3 replicas.
- Make orders show 3/3 ready.
@@ hints
- `kubectl get namespaces` lists them. `kubectl get deploy -A` searches every namespace.
- Most commands use the -n flag: `-n NAMESPACE`.
- `kubectl scale deployment/orders --replicas=3 -n shop`.
- Verify with `kubectl get deploy orders -n shop`.
@@ world
{"k8s": {"namespaces": ["default", "kube-system", "shop"], "images": {"orders:9": {"port": 8080, "health": "/healthz", "body": "orders ok"}}, "deployments": [{"name": "orders", "ns": "shop", "image": "orders:9", "replicas": 1, "port": 8080, "probe": "/healthz"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy orders -n shop",
  "code": 0,
  "out": "3/3",
  "label": "orders in shop shows 3/3"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy",
  "code": 0,
  "notOut": "orders",
  "label": "nothing was created in default by mistake"
 }
]
@@ solution
kubectl get deploy -A
kubectl scale deployment/orders --replicas=3 -n shop
kubectl get deploy orders -n shop
@@ explain
Namespaces separate objects inside a cluster. Commands act on the current namespace unless you pass -n or -A. When something seems missing, search all namespaces before you assume it is gone.

## Triage three broken deployments
id: k8s-triage
module: kubernetes
level: Advanced
minutes: 25
lesson: kubernetes/debugging-kubernetes-workloads
engine: Simulated Kubernetes cluster and shell
summary: Three deployments fail for three different reasons. Work out each one and bring the whole cluster to green.
@@ story
After an overnight change, the dashboard is red. The frontend, the auth service and the reports service are all unhealthy. Treat it as a real incident: look first, name each cause, then fix them with the smallest change.
@@ goals
- Find the cause for each of the three failing deployments.
- Fix them without deleting any deployment.
- Make `kubectl get deploy` show every deployment fully ready.
@@ hints
- Start with `kubectl get pods` to see three different statuses.
- frontend: ImagePullBackOff (describe the pod and read the tag). auth: CrashLoopBackOff (read logs). reports: Running but 0/1 ready (describe shows the probe failing).
- frontend: `kubectl set image deployment/frontend frontend=nginx:1.25`. auth: `kubectl set env deployment/auth JWT_KEY=lab-key`. reports: patch the probe path to /ready.
- Check each with `kubectl get deploy`.
@@ world
{"k8s": {"images": {"nginx:1.25": {"port": 80, "health": "/", "body": "Welcome to nginx"}, "auth:3": {"port": 9000, "needsEnv": ["JWT_KEY"], "health": "/healthz", "body": "auth ok", "crashLog": "FATAL: JWT_KEY missing"}, "reports:6": {"port": 7000, "health": "/ready", "body": "reports ok"}}, "deployments": [{"name": "frontend", "image": "nginx:1.2", "replicas": 2, "port": 80, "probe": "/"}, {"name": "auth", "image": "auth:3", "replicas": 2, "port": 9000, "probe": "/healthz"}, {"name": "reports", "image": "reports:6", "replicas": 2, "port": 7000, "probe": "/health"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "kubectl get deploy frontend",
  "code": 0,
  "out": "2/2",
  "label": "frontend is ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy auth",
  "code": 0,
  "out": "2/2",
  "label": "auth is ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy reports",
  "code": 0,
  "out": "2/2",
  "label": "reports is ready"
 },
 {
  "t": "cmd",
  "run": "kubectl get deploy",
  "code": 0,
  "out": "frontend",
  "label": "no deployment was deleted"
 }
]
@@ solution
kubectl get pods
kubectl describe pod frontend
kubectl set image deployment/frontend frontend=nginx:1.25
kubectl logs $(kubectl get pods -o name | grep auth | head -1 | sed 's#pod/##')
kubectl set env deployment/auth JWT_KEY=lab-key
kubectl describe pod reports
kubectl patch deployment reports -p '{"spec":{"template":{"spec":{"containers":[{"name":"reports","readinessProbe":{"httpGet":{"path":"/ready","port":7000}}}]}}}}'
kubectl get deploy
@@ explain
Different statuses point at different layers. ImagePullBackOff is about the image, CrashLoopBackOff is about the program (read logs), and Running with 0/1 ready is about the probe. Reading status first saves you from trying the same fix on all three.

