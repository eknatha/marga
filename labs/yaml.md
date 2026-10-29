## A minimal Pod
id: pod
task: Write a Pod named "hello" that runs the image nginx:1.27 in a container named "web".
hint: A Pod needs apiVersion v1, kind Pod, metadata.name and spec.containers.
@@ start
apiVersion: v1
kind: Pod
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: hello
spec:
  containers:
    - name: web
      image: nginx:1.27
@@ checks
eq kind Pod
eq metadata.name hello
eq spec.containers.name web
eq spec.containers.image nginx:1.27

## A Deployment with three replicas
id: deploy
task: Write a Deployment "api" with 3 replicas, the label app: api, and one container "api" with image registry.example.com/api:2.4.1. The selector must match the pod label.
hint: spec.selector.matchLabels and spec.template.metadata.labels must carry the same labels.
@@ start
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
@@ sol
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/api:2.4.1
@@ checks
eq kind Deployment
eq spec.replicas 3
eq spec.selector.matchLabels.app api
eq spec.template.metadata.labels.app api
eq spec.template.spec.containers.image registry.example.com/api:2.4.1

## Fix a selector that matches nothing
id: selector
task: This Deployment is valid YAML but its selector does not match the pod labels, so Kubernetes rejects it. Change the pod template label so that both say app: web.
hint: The selector is the rule; the template labels must satisfy it.
@@ start
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
        app: website
    spec:
      containers:
        - name: web
          image: nginx:1.27
@@ sol
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
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.27
@@ checks
eq spec.selector.matchLabels.app web
eq spec.template.metadata.labels.app web

## Set CPU and memory
id: resources
task: Give the container requests of cpu 250m and memory 256Mi and limits of cpu 500m and memory 512Mi.
hint: resources has two maps, requests and limits.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
@@ checks
eq spec.containers.resources.requests.cpu 250m
eq spec.containers.resources.requests.memory 256Mi
eq spec.containers.resources.limits.cpu 500m
eq spec.containers.resources.limits.memory 512Mi

## Add a readiness probe
id: readiness
task: Add a readinessProbe to the container: an HTTP GET on path /ready, port 8080, with initialDelaySeconds 5 and periodSeconds 10.
hint: The probe type httpGet has path and port.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 10
@@ checks
eq spec.containers.readinessProbe.httpGet.path /ready
eq spec.containers.readinessProbe.httpGet.port 8080
eq spec.containers.readinessProbe.initialDelaySeconds 5
eq spec.containers.readinessProbe.periodSeconds 10

## Add a liveness probe that waits for slow starts
id: liveness
task: Add a startupProbe (httpGet /healthz on port 8080, failureThreshold 30, periodSeconds 10) and a livenessProbe (httpGet /healthz on port 8080, periodSeconds 20).
hint: The startup probe gives a slow application up to 30 x 10 seconds before the liveness probe starts.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: slow
spec:
  containers:
    - name: slow
      image: slow:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: slow
spec:
  containers:
    - name: slow
      image: slow:1.0
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30
        periodSeconds: 10
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        periodSeconds: 20
@@ checks
eq spec.containers.startupProbe.failureThreshold 30
eq spec.containers.startupProbe.periodSeconds 10
eq spec.containers.livenessProbe.httpGet.path /healthz
eq spec.containers.livenessProbe.periodSeconds 20

## A ConfigMap
id: configmap
task: Write a ConfigMap "app-config" with the keys LOG_LEVEL set to info and FEATURE_X set to "true" (a string, not a boolean).
hint: Values in a ConfigMap data map are strings. Quote true so that it stays text.
@@ start
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  FEATURE_X: true
@@ sol
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  FEATURE_X: "true"
@@ checks
eq kind ConfigMap
eq data.LOG_LEVEL info
eq data.FEATURE_X true
type data.FEATURE_X string

## A Secret with stringData
id: secret
task: Write a Secret "db" of type Opaque with stringData key password and the value "change-me". Do not put the value under data (data needs base64).
hint: stringData accepts plain text; Kubernetes encodes it for you.
@@ start
apiVersion: v1
kind: Secret
metadata:
  name: db
@@ sol
apiVersion: v1
kind: Secret
metadata:
  name: db
type: Opaque
stringData:
  password: change-me
@@ checks
eq kind Secret
eq type Opaque
eq stringData.password change-me
no data

## Read settings from a ConfigMap and a Secret
id: envfrom
task: In the container, set env DB_HOST from ConfigMap "app-config" key DB_HOST, and env DB_PASSWORD from Secret "db" key password, using valueFrom.
hint: valueFrom has configMapKeyRef and secretKeyRef, each with name and key.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_HOST
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db
              key: password
@@ checks
eq spec.containers.env.name DB_HOST
eq spec.containers.env.valueFrom.configMapKeyRef.name app-config
eq spec.containers.env.name DB_PASSWORD
eq spec.containers.env.valueFrom.secretKeyRef.name db
eq spec.containers.env.valueFrom.secretKeyRef.key password

## A ClusterIP Service
id: service
task: Write a Service "api" that selects pods with app: api and forwards port 80 to container port 8080 (type ClusterIP).
hint: ports has port (the Service) and targetPort (the container).
@@ start
apiVersion: v1
kind: Service
metadata:
  name: api
@@ sol
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
@@ checks
eq kind Service
eq spec.type ClusterIP
eq spec.selector.app api
eq spec.ports.port 80
eq spec.ports.targetPort 8080

## An Ingress
id: ingress
task: Write an Ingress "shop" for host shop.example.com. Path / (type Prefix) goes to Service "web" port 80. Add the tls section with secretName shop-tls for the same host.
hint: rules[].http.paths[].backend.service has name and port.number.
@@ start
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
@@ sol
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  tls:
    - hosts:
        - shop.example.com
      secretName: shop-tls
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
@@ checks
eq spec.rules.host shop.example.com
eq spec.rules.http.paths.path /
eq spec.rules.http.paths.pathType Prefix
eq spec.rules.http.paths.backend.service.name web
eq spec.rules.http.paths.backend.service.port.number 80
eq spec.tls.secretName shop-tls

## Ask for storage
id: pvc
task: Write a PersistentVolumeClaim "data" that requests 10Gi with access mode ReadWriteOnce and storageClassName standard.
hint: resources.requests.storage holds the size.
@@ start
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
@@ sol
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
@@ checks
eq spec.accessModes ReadWriteOnce
eq spec.storageClassName standard
eq spec.resources.requests.storage 10Gi

## Mount a volume
id: volume
task: Mount the PVC "data" into the container at /var/lib/app. Add the volume (name data, claimName data) and the volumeMount.
hint: The volume goes under spec.volumes and the mount under the container, with the same name.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
      volumeMounts:
        - name: data
          mountPath: /var/lib/app
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data
@@ checks
eq spec.containers.volumeMounts.mountPath /var/lib/app
eq spec.containers.volumeMounts.name data
eq spec.volumes.persistentVolumeClaim.claimName data

## A nightly CronJob
id: cronjob
task: Write a CronJob "cleanup" that runs at 02:30 every day (schedule "30 2 * * *"), runs the image busybox:1.36 with the command ["sh", "-c", "echo clean"], and uses restartPolicy OnFailure.
hint: The pod template sits under spec.jobTemplate.spec.template.
@@ start
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
@@ sol
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
spec:
  schedule: "30 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: busybox:1.36
              command: ["sh", "-c", "echo clean"]
@@ checks
eq spec.schedule 30 2 * * *
eq spec.jobTemplate.spec.template.spec.restartPolicy OnFailure
eq spec.jobTemplate.spec.template.spec.containers.image busybox:1.36
type spec.jobTemplate.spec.template.spec.containers.command list

## A one-off Job
id: job
task: Write a Job "migrate" that runs the image app:1.0 with the command ["./migrate"], retries up to 2 times (backoffLimit) and never restarts a failed pod in place (restartPolicy Never).
hint: backoffLimit is under spec, restartPolicy under the pod spec.
@@ start
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
@@ sol
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
spec:
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: app:1.0
          command: ["./migrate"]
@@ checks
eq spec.backoffLimit 2
eq spec.template.spec.restartPolicy Never
eq spec.template.spec.containers.image app:1.0

## Autoscale a Deployment
id: hpa
task: Write a HorizontalPodAutoscaler "api" for Deployment "api": minimum 2, maximum 10 replicas, target average CPU utilization 70 percent.
hint: apiVersion autoscaling/v2. metrics is a list with type Resource.
@@ start
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
@@ sol
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
@@ checks
eq spec.scaleTargetRef.name api
eq spec.minReplicas 2
eq spec.maxReplicas 10
eq spec.metrics.resource.target.averageUtilization 70

## Deny all traffic by default
id: netpol
task: Write a NetworkPolicy "default-deny" that selects every pod in the namespace and blocks all ingress and egress traffic.
hint: An empty podSelector selects all pods. policyTypes lists Ingress and Egress, and no rules means nothing is allowed.
@@ start
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
@@ sol
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
@@ checks
eq spec.policyTypes Ingress
eq spec.policyTypes Egress
no spec.ingress
no spec.egress

## Read-only access with RBAC
id: rbac
task: In one file with two documents, write a Role "pod-reader" (get, list, watch on pods) and a RoleBinding "read-pods" that binds it to the ServiceAccount "ci" in namespace "shop".
hint: Separate the two documents with a line of three dashes. The RoleBinding has subjects and roleRef.
@@ start
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
@@ sol
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: shop
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: shop
subjects:
  - kind: ServiceAccount
    name: ci
    namespace: shop
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
@@ checks
docs 2
eq @0 kind Role
eq @0 rules.resources pods
eq @0 rules.verbs list
ne @0 rules.verbs delete
eq @1 kind RoleBinding
eq @1 subjects.name ci
eq @1 roleRef.name pod-reader

## Run as a non-root user
id: nonroot
task: Harden the container: runAsNonRoot true, runAsUser 10001, readOnlyRootFilesystem true, allowPrivilegeEscalation false and drop all capabilities.
hint: These settings are in the container securityContext. capabilities.drop takes a list.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]
@@ checks
eq spec.containers.securityContext.runAsNonRoot true
eq spec.containers.securityContext.runAsUser 10001
eq spec.containers.securityContext.readOnlyRootFilesystem true
eq spec.containers.securityContext.allowPrivilegeEscalation false
eq spec.containers.securityContext.capabilities.drop ALL

## Reuse settings with anchors
id: anchors
task: Define the common settings once with an anchor (&defaults) and reuse them in both services with a merge key (<<: *defaults). The settings are restart: always and log_level: info. Service "web" adds port 80, service "worker" adds port 9000.
hint: &name creates an anchor, *name refers to it, and <<: merges the map.
@@ start
defaults:
  restart: always
  log_level: info
web:
  restart: always
  log_level: info
  port: 80
worker:
  restart: always
  log_level: info
  port: 9000
@@ sol
defaults: &defaults
  restart: always
  log_level: info
web:
  <<: *defaults
  port: 80
worker:
  <<: *defaults
  port: 9000
@@ checks
eq web.restart always
eq web.log_level info
eq web.port 80
eq worker.restart always
eq worker.port 9000
src &defaults
src <<:\s*\*defaults
nosrc restart: always\n\s+log_level: info\nweb:\n\s+restart

## Multi-line text
id: multiline
task: Write a ConfigMap "script" with the key run holding three lines (keep the line breaks): #!/bin/sh, echo start and exec "$@". Use a literal block with the pipe character.
hint: key: | followed by indented lines keeps every newline.
@@ start
apiVersion: v1
kind: ConfigMap
metadata:
  name: script
data:
  run: placeholder
@@ sol
apiVersion: v1
kind: ConfigMap
metadata:
  name: script
data:
  run: |
    #!/bin/sh
    echo start
    exec "$@"
@@ checks
match data.run ^#!/bin/sh\necho start\nexec
eq metadata.name script

## Fix an indentation mistake
id: indent
task: This file is not valid because one line is indented wrongly. Fix it so that the YAML loads and "ports" belongs to the container.
hint: Siblings in a map must have the same indentation. Use spaces, never tabs.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
     ports:
        - containerPort: 8080
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: app:1.0
      ports:
        - containerPort: 8080
@@ checks
eq spec.containers.name app
eq spec.containers.ports.containerPort 8080

## Avoid the version number trap
id: types
task: The file below turns "1.20" into the number 1.2 and "010" into a number. Quote the values so that both stay strings: version "1.20" and build "010".
hint: Quotes tell YAML that a value is a string.
@@ start
version: 1.20
build: 010
name: release
@@ sol
version: "1.20"
build: "010"
name: release
@@ checks
type version string
eq version 1.20
type build string
eq build 010

## A Docker Compose file
id: compose
task: Write a Compose file with services web (image nginx:1.27, ports "8080:80", depends_on api) and api (image api:1.0, environment LOG_LEVEL=info).
hint: Quote the port mapping so that YAML does not read it as a number in base 60.
@@ start
services:
  web:
    image: nginx:1.27
@@ sol
services:
  web:
    image: nginx:1.27
    ports:
      - "8080:80"
    depends_on:
      - api
  api:
    image: api:1.0
    environment:
      LOG_LEVEL: info
@@ checks
eq services.web.ports 8080:80
eq services.web.depends_on api
eq services.api.image api:1.0
eq services.api.environment.LOG_LEVEL info

## A Prometheus scrape job
id: prom
task: Write a Prometheus config with scrape_interval 15s and one scrape job "node" that scrapes the targets node1:9100 and node2:9100.
hint: scrape_configs is a list. Each job has job_name and static_configs with targets.
@@ start
global:
  scrape_interval: 15s
@@ sol
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node1:9100", "node2:9100"]
@@ checks
eq global.scrape_interval 15s
eq scrape_configs.job_name node
eq scrape_configs.static_configs.targets node1:9100
eq scrape_configs.static_configs.targets node2:9100

## A Prometheus alert rule
id: alertrule
task: Write a rule group "api" with the alert HighErrorRate. The expression is job:errors:ratio5m > 0.02, it must hold for 10m, the label severity is page, and the annotation summary describes it.
hint: groups is a list. Each group has rules with alert, expr, for, labels and annotations.
@@ start
groups:
  - name: api
    rules: []
@@ sol
groups:
  - name: api
    rules:
      - alert: HighErrorRate
        expr: job:errors:ratio5m > 0.02
        for: 10m
        labels:
          severity: page
        annotations:
          summary: More than 2 percent of requests fail
@@ checks
eq groups.name api
eq groups.rules.alert HighErrorRate
eq groups.rules.for 10m
eq groups.rules.labels.severity page
has groups.rules.annotations.summary

## Route alerts in Alertmanager
id: alertmanager
task: Write an Alertmanager route with receiver "team-chat" as the default, grouped by alertname, and a child route that sends severity=page alerts to receiver "oncall". Declare both receivers.
hint: route.routes is a list of child routes with match or matchers. receivers lists the names.
@@ start
route:
  receiver: team-chat
receivers:
  - name: team-chat
@@ sol
route:
  receiver: team-chat
  group_by: ["alertname"]
  routes:
    - matchers:
        - severity="page"
      receiver: oncall
receivers:
  - name: team-chat
  - name: oncall
@@ checks
eq route.receiver team-chat
eq route.group_by alertname
eq route.routes.receiver oncall
match route.routes.matchers severity
eq receivers.name oncall

## Helm values for production
id: helmvalues
task: Write a values.yaml with replicaCount 3, image repository registry.example.com/api and tag "2.4.1" (a string), resources limits memory 512Mi, and ingress enabled true with host api.example.com.
hint: Quote the tag so that numbers like 2.4 do not turn into floats.
@@ start
replicaCount: 1
@@ sol
replicaCount: 3
image:
  repository: registry.example.com/api
  tag: "2.4.1"
resources:
  limits:
    memory: 512Mi
ingress:
  enabled: true
  host: api.example.com
@@ checks
eq replicaCount 3
eq image.repository registry.example.com/api
type image.tag string
eq resources.limits.memory 512Mi
eq ingress.enabled true
eq ingress.host api.example.com

## An Ansible playbook
id: ansible
task: Write a playbook with one play for hosts "web", become true, and two tasks: install the package nginx (module package, state present) and start the service nginx (module service, state started, enabled true).
hint: A playbook is a list of plays. Each play has hosts and tasks.
@@ start
- hosts: web
@@ sol
- hosts: web
  become: true
  tasks:
    - name: Install nginx
      package:
        name: nginx
        state: present
    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: true
@@ checks
eq @0 hosts web
count @0 tasks >= 2
eq @0 tasks.package.name nginx
eq @0 tasks.service.state started
eq @0 tasks.service.enabled true

## A pipeline file with stages
id: ci
task: Write a pipeline file with stages [build, test, deploy] and a job "unit" in stage test that runs the script "make test" and keeps artifacts for 1 week (expire_in "1 week").
hint: stages is a list. A job names its stage and has a script list.
@@ start
stages:
  - build
@@ sol
stages:
  - build
  - test
  - deploy
unit:
  stage: test
  script:
    - make test
  artifacts:
    expire_in: 1 week
@@ checks
len stages == 3
eq stages test
eq unit.stage test
eq unit.script make test
eq unit.artifacts.expire_in 1 week

## A Namespace with labels
id: namespace
task: Write a Namespace named "payments" with the labels team: payments and env: prod.
hint: Labels live under metadata.labels.
@@ start
apiVersion: v1
kind: Namespace
@@ sol
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    team: payments
    env: prod
@@ checks
eq kind Namespace
eq metadata.name payments
eq metadata.labels.team payments
eq metadata.labels.env prod

## A ServiceAccount without a token mount
id: sa
task: Write a ServiceAccount named "reporter" in the namespace "payments" with automountServiceAccountToken set to false.
hint: automountServiceAccountToken is a top-level field next to metadata.
@@ start
apiVersion: v1
kind: ServiceAccount
metadata:
  name: reporter
@@ sol
apiVersion: v1
kind: ServiceAccount
metadata:
  name: reporter
  namespace: payments
automountServiceAccountToken: false
@@ checks
eq kind ServiceAccount
eq metadata.namespace payments
eq automountServiceAccountToken false

## A read-only root filesystem
id: readonlyfs
task: Write a Pod "tight" with one container "app" (image registry.example.com/app:1.0) whose securityContext sets readOnlyRootFilesystem to true and allowPrivilegeEscalation to false.
hint: The container securityContext sits under spec.containers.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: tight
spec:
  containers:
    - name: app
      image: registry.example.com/app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: tight
spec:
  containers:
    - name: app
      image: registry.example.com/app:1.0
      securityContext:
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
@@ checks
eq spec.containers.securityContext.readOnlyRootFilesystem true
eq spec.containers.securityContext.allowPrivilegeEscalation false

## Drop all Linux capabilities
id: dropcaps
task: Write a Pod "caps" with a container "app" (image registry.example.com/app:1.0) that drops ALL capabilities and adds only NET_BIND_SERVICE.
hint: securityContext.capabilities has drop and add lists.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: caps
spec:
  containers:
    - name: app
      image: registry.example.com/app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: caps
spec:
  containers:
    - name: app
      image: registry.example.com/app:1.0
      securityContext:
        capabilities:
          drop: ["ALL"]
          add: ["NET_BIND_SERVICE"]
@@ checks
eq spec.containers.securityContext.capabilities.drop ALL
eq spec.containers.securityContext.capabilities.add NET_BIND_SERVICE

## A startup probe
id: startup
task: Write a Pod "slow" with a container "app" (image registry.example.com/slow:1.0) and a startupProbe that does an httpGet on /healthz port 8080 with failureThreshold 30 and periodSeconds 5.
hint: A startup probe gives slow applications time before liveness checks begin.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: slow
spec:
  containers:
    - name: app
      image: registry.example.com/slow:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: slow
spec:
  containers:
    - name: app
      image: registry.example.com/slow:1.0
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30
        periodSeconds: 5
@@ checks
eq spec.containers.startupProbe.httpGet.path /healthz
eq spec.containers.startupProbe.httpGet.port 8080
eq spec.containers.startupProbe.failureThreshold 30
eq spec.containers.startupProbe.periodSeconds 5

## An init container
id: initcontainer
task: Write a Pod "web" with an init container "wait-db" (image busybox:1.36, command sh -c "until nc -z db 5432; do sleep 2; done") and a main container "app" (image registry.example.com/app:1.0).
hint: initContainers is a sibling of containers under spec.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: app
      image: registry.example.com/app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  initContainers:
    - name: wait-db
      image: busybox:1.36
      command: ["sh", "-c", "until nc -z db 5432; do sleep 2; done"]
  containers:
    - name: app
      image: registry.example.com/app:1.0
@@ checks
eq spec.initContainers.name wait-db
eq spec.initContainers.image busybox:1.36
eq spec.containers.name app

## A sidecar that shares an emptyDir
id: sidecar
task: Write a Pod "logger" with two containers: "app" (image registry.example.com/app:1.0) and "shipper" (image registry.example.com/shipper:1.0). Both mount an emptyDir volume named logs at /var/log/app.
hint: Define the volume under spec.volumes and mount it in each container with volumeMounts.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: logger
spec:
  containers:
    - name: app
      image: registry.example.com/app:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: logger
spec:
  volumes:
    - name: logs
      emptyDir: {}
  containers:
    - name: app
      image: registry.example.com/app:1.0
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
    - name: shipper
      image: registry.example.com/shipper:1.0
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
@@ checks
eq spec.volumes.name logs
eq spec.containers.name shipper
eq spec.containers.volumeMounts.mountPath /var/log/app
count spec.containers == 2

## A PodDisruptionBudget
id: pdb
task: Write a PodDisruptionBudget "api" that keeps at least 2 pods of the app: api selector available during voluntary disruptions.
hint: apiVersion policy/v1. spec.minAvailable and spec.selector.matchLabels.
@@ start
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
@@ sol
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
@@ checks
eq kind PodDisruptionBudget
eq spec.minAvailable 2
eq spec.selector.matchLabels.app api

## Node affinity for a dedicated pool
id: nodeaffinity
task: Write a Pod "batch" (container "job", image registry.example.com/job:1.0) that must run on nodes labelled pool=batch, using requiredDuringSchedulingIgnoredDuringExecution node affinity.
hint: affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms with matchExpressions.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: batch
spec:
  containers:
    - name: job
      image: registry.example.com/job:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: batch
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: pool
                operator: In
                values: ["batch"]
  containers:
    - name: job
      image: registry.example.com/job:1.0
@@ checks
eq spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.matchExpressions.key pool
eq spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.matchExpressions.operator In
eq spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.matchExpressions.values batch

## A toleration for a tainted node
id: toleration
task: Write a Pod "gpu" (container "train", image registry.example.com/train:1.0) that tolerates the taint dedicated=gpu with effect NoSchedule.
hint: tolerations is a list under spec with key, operator, value and effect.
@@ start
apiVersion: v1
kind: Pod
metadata:
  name: gpu
spec:
  containers:
    - name: train
      image: registry.example.com/train:1.0
@@ sol
apiVersion: v1
kind: Pod
metadata:
  name: gpu
spec:
  tolerations:
    - key: dedicated
      operator: Equal
      value: gpu
      effect: NoSchedule
  containers:
    - name: train
      image: registry.example.com/train:1.0
@@ checks
eq spec.tolerations.key dedicated
eq spec.tolerations.value gpu
eq spec.tolerations.effect NoSchedule

## A rolling update strategy
id: rolling
task: Write a Deployment "api" with 4 replicas, label app: api, image registry.example.com/api:1.0 and a RollingUpdate strategy with maxUnavailable 0 and maxSurge 1.
hint: spec.strategy.type and spec.strategy.rollingUpdate.
@@ start
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
@@ sol
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/api:1.0
@@ checks
eq spec.replicas 4
eq spec.strategy.type RollingUpdate
eq spec.strategy.rollingUpdate.maxUnavailable 0
eq spec.strategy.rollingUpdate.maxSurge 1

## A StatefulSet with storage
id: statefulset
task: Write a StatefulSet "db" with serviceName "db", 3 replicas, label app: db, container "pg" (image postgres:16) and a volumeClaimTemplate named data that requests 10Gi with ReadWriteOnce.
hint: volumeClaimTemplates sits under spec, next to template.
@@ start
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
@@ sol
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: pg
          image: postgres:16
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
@@ checks
eq kind StatefulSet
eq spec.serviceName db
eq spec.replicas 3
eq spec.volumeClaimTemplates.metadata.name data
eq spec.volumeClaimTemplates.spec.resources.requests.storage 10Gi

## A DaemonSet on every node
id: daemonset
task: Write a DaemonSet "node-agent" with label app: node-agent and one container "agent" (image registry.example.com/agent:1.0).
hint: A DaemonSet needs a selector that matches the template labels, like a Deployment.
@@ start
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
@@ sol
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
spec:
  selector:
    matchLabels:
      app: node-agent
  template:
    metadata:
      labels:
        app: node-agent
    spec:
      containers:
        - name: agent
          image: registry.example.com/agent:1.0
@@ checks
eq kind DaemonSet
eq spec.selector.matchLabels.app node-agent
eq spec.template.metadata.labels.app node-agent
eq spec.template.spec.containers.name agent

## A ResourceQuota for a namespace
id: quota
task: Write a ResourceQuota "team-quota" in the namespace "payments" limiting pods to 20, requests.cpu to "10" and requests.memory to 20Gi.
hint: Quota limits live under spec.hard.
@@ start
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
@@ sol
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: payments
spec:
  hard:
    pods: "20"
    requests.cpu: "10"
    requests.memory: 20Gi
@@ checks
eq metadata.namespace payments
eq spec.hard.pods 20
src requests\.memory:\s*20Gi

## A LimitRange with defaults
id: limitrange
task: Write a LimitRange "defaults" in the namespace "payments" that gives containers a default request of cpu 100m and memory 128Mi, and a default limit of cpu 500m and memory 512Mi.
hint: spec.limits is a list. type Container, with defaultRequest and default.
@@ start
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: payments
@@ sol
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: payments
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 500m
        memory: 512Mi
@@ checks
eq spec.limits.type Container
eq spec.limits.defaultRequest.cpu 100m
eq spec.limits.default.memory 512Mi

## An ExternalName service
id: externalname
task: Write a Service "billing-db" of type ExternalName that points to the host db.billing.example.com.
hint: spec.type ExternalName and spec.externalName.
@@ start
apiVersion: v1
kind: Service
metadata:
  name: billing-db
@@ sol
apiVersion: v1
kind: Service
metadata:
  name: billing-db
spec:
  type: ExternalName
  externalName: db.billing.example.com
@@ checks
eq spec.type ExternalName
eq spec.externalName db.billing.example.com

## A multi-document file
id: multidoc
task: Write one file with two documents separated by ---: a Namespace "shop" and a ServiceAccount "shop-sa" in that namespace.
hint: Separate the documents with a line that contains three dashes.
@@ start
apiVersion: v1
kind: Namespace
metadata:
  name: shop
@@ sol
apiVersion: v1
kind: Namespace
metadata:
  name: shop
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: shop-sa
  namespace: shop
@@ checks
docs 2
eq @0 kind Namespace
eq @1 kind ServiceAccount
eq @1 metadata.namespace shop

## A CI job with variables
id: cijob2
task: Write a CI file with stages build and test, a variable GOFLAGS: "-mod=readonly" at the top, and a job "unit" in the test stage that runs "go test ./...".
hint: The top level holds stages, variables and one key per job.
@@ start
stages:
  - build
  - test
@@ sol
stages:
  - build
  - test
variables:
  GOFLAGS: "-mod=readonly"
unit:
  stage: test
  script:
    - go test ./...
@@ checks
len stages == 2
eq variables.GOFLAGS -mod=readonly
eq unit.stage test
eq unit.script go test ./...

## A Compose service with a healthcheck
id: composehealth
task: Write a Compose file with a service "db" using image postgres:16 and a healthcheck that runs ["CMD-SHELL", "pg_isready -U postgres"] every 10s with 5 retries.
hint: healthcheck has test, interval and retries.
@@ start
services:
  db:
    image: postgres:16
@@ sol
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      retries: 5
@@ checks
eq services.db.image postgres:16
eq services.db.healthcheck.interval 10s
eq services.db.healthcheck.retries 5
match services.db.healthcheck.test pg_isready

## An Ansible task with a handler
id: ansiblehandler
task: Write an Ansible play for hosts "web" with a task that copies nginx.conf to /etc/nginx/nginx.conf and notifies the handler "restart nginx". Define that handler with the service module (name nginx, state restarted).
hint: notify on the task, and handlers at the same level as tasks.
@@ start
- hosts: web
  tasks: []
@@ sol
- hosts: web
  tasks:
    - name: Copy nginx config
      ansible.builtin.copy:
        src: nginx.conf
        dest: /etc/nginx/nginx.conf
      notify: restart nginx
  handlers:
    - name: restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
@@ checks
eq @0 hosts web
eq @0 tasks.notify restart nginx
eq @0 handlers.name restart nginx
src state:\s*restarted
