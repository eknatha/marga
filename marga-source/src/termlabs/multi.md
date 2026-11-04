## Checkout returns 502: three layers deep
id: ms-checkout-502
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A web proxy, an app and a database pooler each hide one fault. Fix them in request order.
@@ story
Customers see 502 Bad Gateway on checkout after last night release. The request goes through nginx, then the app, then PgBouncer to the database. Each layer has a separate mistake, and the second only shows once the first is fixed.
@@ goals
- Layer 1: nginx sends traffic to the app port 8080
- Layer 2: the app uses the current database host db-primary
- Layer 3: the pooler allows 1000 client connections
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- proxy.conf: s#127.0.0.1:8081#127.0.0.1:8080#
@@ world
{"cwd": "/home/user/ms-checkout-502"}
@@ file /home/user/ms-checkout-502/symptoms.md
# Checkout 502
Request path: browser -> nginx (proxy.conf) -> app (app.env) -> pooler (pgbouncer.ini) -> database

1. nginx error log: connect() failed (111: Connection refused) while connecting to upstream 127.0.0.1:8081
2. After that is fixed the app log says: could not translate host name db-old to address
3. After that is fixed the pooler says: no more connections allowed (max_client_conn)

@@ file /home/user/ms-checkout-502/proxy.conf
server {
  listen 80;
  location / { proxy_pass http://127.0.0.1:8081; }
}

@@ file /home/user/ms-checkout-502/app.env
APP_PORT=8080
DB_HOST=db-old
DB_PORT=6432

@@ file /home/user/ms-checkout-502/pgbouncer.ini
[pgbouncer]
max_client_conn = 20
default_pool_size = 20

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-checkout-502/proxy.conf",
  "label": "nginx sends traffic to the app port 8080",
  "re": "proxy_pass http://127\\.0\\.0\\.1:8080"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-checkout-502/proxy.conf",
  "label": "nginx sends traffic to the app port 8080 (old value removed)",
  "re": "8081",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-checkout-502/app.env",
  "label": "the app uses the current database host db-primary",
  "re": "DB_HOST=db-primary"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-checkout-502/app.env",
  "label": "the app uses the current database host db-primary (old value removed)",
  "re": "db-old",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-checkout-502/pgbouncer.ini",
  "label": "the pooler allows 1000 client connections",
  "re": "max_client_conn = 1000"
 }
]
@@ explain
Faults hide behind each other: a connection refused at the proxy stops the request before it can show the DNS error, which stops it before it can show the pooler limit. Read the path from the outside in, change one thing, retest, and read the next log.
@@ solution
cat symptoms.md
cat proxy.conf
sed -i 's#127.0.0.1:8081#127.0.0.1:8080#' proxy.conf
cat app.env
sed -i 's#DB_HOST=db-old#DB_HOST=db-primary#' app.env
cat pgbouncer.ini
sed -i 's#max_client_conn = 20#max_client_conn = 1000#' pgbouncer.ini
cat proxy.conf


## Ingress up, page still 503
id: ms-ingress-service-port
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: An Ingress, a Service and a Deployment disagree on names and ports.
@@ story
The shop site returns 503 from the ingress. The Ingress names a Service port, the Service targets a container port, and the Deployment readiness probe checks a path. Fix them from the Ingress inwards.
@@ goals
- Layer 1: the Ingress uses the port name http
- Layer 2: the Service forwards to container port 8080
- Layer 3: the readiness probe uses the real path /ready
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- ingress.yaml: s#name: web-http#name: http#
@@ world
{"cwd": "/home/user/ms-ingress-service-port"}
@@ file /home/user/ms-ingress-service-port/symptoms.md
# Shop 503
Path: Ingress (ingress.yaml) -> Service (service.yaml) -> Pod (deployment.yaml)

1. ingress controller log: service "shop/web" has no endpoints for port "http"
2. kubectl describe service: targetPort 3000, but the container listens on 8080
3. Pod events: Readiness probe failed: HTTP probe failed with statuscode: 404 on /healthz

@@ file /home/user/ms-ingress-service-port/ingress.yaml
spec:
  rules:
  - host: shop.example.com
    http:
      paths:
      - path: /
        backend:
          service:
            name: web
            port:
              name: web-http

@@ file /home/user/ms-ingress-service-port/service.yaml
spec:
  selector:
    app: web
  ports:
  - name: http
    port: 80
    targetPort: 3000

@@ file /home/user/ms-ingress-service-port/deployment.yaml
containers:
- name: web
  ports:
  - containerPort: 8080
  readinessProbe:
    httpGet: {path: /healthz, port: 8080}

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-ingress-service-port/ingress.yaml",
  "label": "the Ingress uses the port name http",
  "re": "name: http$"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-ingress-service-port/ingress.yaml",
  "label": "the Ingress uses the port name http (old value removed)",
  "re": "web-http",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-ingress-service-port/service.yaml",
  "label": "the Service forwards to container port 8080",
  "re": "targetPort: 8080"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-ingress-service-port/service.yaml",
  "label": "the Service forwards to container port 8080 (old value removed)",
  "re": "3000",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-ingress-service-port/deployment.yaml",
  "label": "the readiness probe uses the real path /ready",
  "re": "path: /ready"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-ingress-service-port/deployment.yaml",
  "label": "the readiness probe uses the real path /ready (old value removed)",
  "re": "/healthz",
  "not": true
 }
]
@@ explain
Ingress, Service and Pod each carry a name or a port, and all must match. A missing endpoint list means the Service selects no ready pods, which can be a port, a label or a probe problem.
@@ solution
cat symptoms.md
cat ingress.yaml
sed -i 's#name: web-http#name: http#' ingress.yaml
cat service.yaml
sed -i 's#targetPort: 3000#targetPort: 8080#' service.yaml
cat deployment.yaml
sed -i 's#path: /healthz#path: /ready#' deployment.yaml
cat ingress.yaml


## Orders stuck in the queue
id: ms-queue-backlog
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A consumer, its broker settings and its autoscaler all contribute to a growing backlog.
@@ story
The order queue has 400000 messages waiting. The consumer deployment, its broker settings and its autoscaler each have a fault. Fix them in the order that the data flows.
@@ goals
- Layer 1: the worker connects to the broker port 5672
- Layer 2: the autoscaler keeps at least 4 workers
- Layer 3: the prefetch is raised to 20
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- worker.env: s#broker:5673#broker:5672#
@@ world
{"cwd": "/home/user/ms-queue-backlog"}
@@ file /home/user/ms-queue-backlog/symptoms.md
# Queue backlog
Flow: producer -> broker -> consumer (worker.env) -> autoscaler (hpa.yaml) -> deployment (deploy.yaml)

1. worker log: connection refused to amqp://broker:5673
2. After the fix, consumers run but only 1 pod exists, since the HPA minReplicas is 1 and scales on CPU
3. Pods are limited to 1 message at a time (prefetch 1)

@@ file /home/user/ms-queue-backlog/worker.env
BROKER_URL=amqp://broker:5673
PREFETCH=1

@@ file /home/user/ms-queue-backlog/hpa.yaml
spec:
  minReplicas: 1
  maxReplicas: 20
  metrics:
  - type: Resource
    resource: {name: cpu}

@@ file /home/user/ms-queue-backlog/deploy.yaml
env:
- name: PREFETCH
  value: "1"

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-queue-backlog/worker.env",
  "label": "the worker connects to the broker port 5672",
  "re": "broker:5672"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-queue-backlog/worker.env",
  "label": "the worker connects to the broker port 5672 (old value removed)",
  "re": "5673",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-queue-backlog/hpa.yaml",
  "label": "the autoscaler keeps at least 4 workers",
  "re": "minReplicas: 4"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-queue-backlog/deploy.yaml",
  "label": "the prefetch is raised to 20",
  "re": "value: \"20\""
 },
 {
  "t": "contains",
  "path": "/home/user/ms-queue-backlog/deploy.yaml",
  "label": "the prefetch is raised to 20 (old value removed)",
  "re": "\"1\"",
  "not": true
 }
]
@@ explain
A backlog is a rate problem. Check that consumers can connect, that enough of them run, and that each processes a useful number at a time. Queue depth is a better scaling signal than CPU for this kind of worker.
@@ solution
cat symptoms.md
cat worker.env
sed -i 's#broker:5673#broker:5672#' worker.env
cat hpa.yaml
sed -i 's#minReplicas: 1#minReplicas: 4#' hpa.yaml
cat deploy.yaml
sed -i 's#value: "1"#value: "20"#' deploy.yaml
cat worker.env


## Login takes eight seconds
id: ms-slow-login
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: DNS search settings, a timeout and a missing index add up to a slow login.
@@ story
Users wait about eight seconds to log in. The delay comes from three places: slow name lookups in the pod, a client timeout that hides retries, and a missing index on the users table.
@@ goals
- Layer 1: the resolver uses ndots:2
- Layer 2: the client timeout is 3s
- Layer 3: the migration adds an index on email concurrently
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- resolv.conf: s#ndots:5#ndots:2#
@@ world
{"cwd": "/home/user/ms-slow-login"}
@@ file /home/user/ms-slow-login/symptoms.md
# Slow login
Path: app -> DNS (resolv.conf) -> app config (app.yaml) -> database (migration.sql)

1. strace shows each lookup trying five search domains before the right name (ndots:5)
2. The HTTP client timeout is 30 s, so slow dependencies are not cut off
3. The query SELECT * FROM users WHERE email = ? does a sequential scan

@@ file /home/user/ms-slow-login/resolv.conf
search shop.svc.cluster.local svc.cluster.local cluster.local
options ndots:5

@@ file /home/user/ms-slow-login/app.yaml
http:
  timeout: 30s
  retries: 3

@@ file /home/user/ms-slow-login/migration.sql
-- add the missing index

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-slow-login/resolv.conf",
  "label": "the resolver uses ndots:2",
  "re": "ndots:2"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-slow-login/resolv.conf",
  "label": "the resolver uses ndots:2 (old value removed)",
  "re": "ndots:5",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-slow-login/app.yaml",
  "label": "the client timeout is 3s",
  "re": "timeout: 3s"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-slow-login/app.yaml",
  "label": "the client timeout is 3s (old value removed)",
  "re": "30s",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-slow-login/migration.sql",
  "label": "the migration adds an index on email concurrently",
  "re": "CREATE INDEX CONCURRENTLY\\s+\\w+\\s+ON\\s+users\\s*\\(\\s*email"
 }
]
@@ explain
Latency is the sum of many small waits. Fix each: fewer useless lookups, a sensible timeout so a failure is fast and visible, and an index for the common query.
@@ solution
cat symptoms.md
cat resolv.conf
sed -i 's#ndots:5#ndots:2#' resolv.conf
cat app.yaml
sed -i 's#timeout: 30s#timeout: 3s#' app.yaml
cat migration.sql
sed -i '$a CREATE INDEX CONCURRENTLY users_email_idx ON users (email);' migration.sql
cat resolv.conf


## Pod crash loop: config, secret and probe
id: ms-crashloop-config
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A missing config key, a wrong secret name and a slow readiness probe stack up.
@@ story
The api pod restarts forever. Kubernetes shows three different messages over time as you fix each one.
@@ goals
- Layer 1: the ConfigMap defines LOG_LEVEL
- Layer 2: the pod references the real secret api-credentials
- Layer 3: the liveness probe waits 30 seconds
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- configmap.yaml: $a \  LOG_LEVEL: "info"
@@ world
{"cwd": "/home/user/ms-crashloop-config"}
@@ file /home/user/ms-crashloop-config/symptoms.md
# CrashLoopBackOff
Order: configmap.yaml -> deployment.yaml (secret) -> deployment.yaml (probe)

1. Error: configmap key "LOG_LEVEL" not found
2. After that: secret "api-creds" not found (the secret is named api-credentials)
3. After that: liveness probe failed, initialDelaySeconds is 1 and the app takes 20 s to start

@@ file /home/user/ms-crashloop-config/configmap.yaml
data:
  PORT: "8080"

@@ file /home/user/ms-crashloop-config/secretref.yaml
envFrom:
- secretRef:
    name: api-creds

@@ file /home/user/ms-crashloop-config/probe.yaml
livenessProbe:
  httpGet: {path: /health, port: 8080}
  initialDelaySeconds: 1

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-crashloop-config/configmap.yaml",
  "label": "the ConfigMap defines LOG_LEVEL",
  "re": "LOG_LEVEL:\\s*\"info\""
 },
 {
  "t": "contains",
  "path": "/home/user/ms-crashloop-config/secretref.yaml",
  "label": "the pod references the real secret api-credentials",
  "re": "name: api-credentials"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-crashloop-config/secretref.yaml",
  "label": "the pod references the real secret api-credentials (old value removed)",
  "re": "api-creds\\b(?!entials)",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-crashloop-config/probe.yaml",
  "label": "the liveness probe waits 30 seconds",
  "re": "initialDelaySeconds: 30"
 }
]
@@ explain
A pod can fail for several independent reasons, and the error you see is only the first. Fix in order and read the new event each time.
@@ solution
cat symptoms.md
cat configmap.yaml
sed -i '$a \  LOG_LEVEL: "info"' configmap.yaml
cat secretref.yaml
sed -i 's#api-creds#api-credentials#' secretref.yaml
cat probe.yaml
sed -i 's#initialDelaySeconds: 1#initialDelaySeconds: 30#' probe.yaml
cat configmap.yaml


## Canary rollout returns 503s
id: ms-mesh-canary-503
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A weight rule, a missing subset and strict mTLS combine to break a mesh canary.
@@ story
You set a 90/10 canary in the mesh and now 10 percent of calls fail with 503. The weights, the subset label and the mTLS mode all need attention.
@@ goals
- Layer 1: the weights add up to 100
- Layer 2: the v2 subset selects version: v2
- Layer 3: mTLS is permissive while legacy clients migrate
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- virtualservice.yaml: s#weight: 20#weight: 10#
@@ world
{"cwd": "/home/user/ms-mesh-canary-503"}
@@ file /home/user/ms-mesh-canary-503/symptoms.md
# Mesh canary 503
Files: virtualservice.yaml, destinationrule.yaml, peerauth.yaml

1. istioctl analyze: weights sum to 110
2. 503 UC: subset v2 selects version: v-2, but pods are labelled version: v2
3. Pods in namespace legacy fail: client without sidecar rejected by STRICT mTLS

@@ file /home/user/ms-mesh-canary-503/virtualservice.yaml
http:
- route:
  - destination: {host: web, subset: v1}
    weight: 90
  - destination: {host: web, subset: v2}
    weight: 20

@@ file /home/user/ms-mesh-canary-503/destinationrule.yaml
subsets:
- name: v1
  labels: {version: v1}
- name: v2
  labels: {version: v-2}

@@ file /home/user/ms-mesh-canary-503/peerauth.yaml
spec:
  mtls:
    mode: STRICT

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-mesh-canary-503/virtualservice.yaml",
  "label": "the weights add up to 100",
  "re": "weight: 10$"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-mesh-canary-503/virtualservice.yaml",
  "label": "the weights add up to 100 (old value removed)",
  "re": "weight: 20",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-mesh-canary-503/destinationrule.yaml",
  "label": "the v2 subset selects version: v2",
  "re": "version: v2\\}"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-mesh-canary-503/destinationrule.yaml",
  "label": "the v2 subset selects version: v2 (old value removed)",
  "re": "v-2",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-mesh-canary-503/peerauth.yaml",
  "label": "mTLS is permissive while legacy clients migrate",
  "re": "mode: PERMISSIVE"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-mesh-canary-503/peerauth.yaml",
  "label": "mTLS is permissive while legacy clients migrate (old value removed)",
  "re": "STRICT",
  "not": true
 }
]
@@ explain
Mesh rules are validated by name and label, so small typos produce 503s rather than clear errors. Use analyze tools, and use permissive mode while unmeshed clients still exist.
@@ solution
cat symptoms.md
cat virtualservice.yaml
sed -i 's#weight: 20#weight: 10#' virtualservice.yaml
cat destinationrule.yaml
sed -i 's#version: v-2#version: v2#' destinationrule.yaml
cat peerauth.yaml
sed -i 's#mode: STRICT#mode: PERMISSIVE#' peerauth.yaml
cat virtualservice.yaml


## Load balancer marks every target unhealthy
id: ms-lb-health-chain
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A security group, a target port and a health check path disagree.
@@ story
After a Terraform change, the load balancer shows all targets unhealthy. The security group, the target group port and the health check path each differ from what the app does.
@@ goals
- Layer 1: the security group allows port 8080
- Layer 2: the target group uses port 8080
- Layer 3: the health check path is /health
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- sg.tf: s#from_port = 80#from_port = 8080#; s#to_port   = 80#to_port   = 8080#
@@ world
{"cwd": "/home/user/ms-lb-health-chain"}
@@ file /home/user/ms-lb-health-chain/symptoms.md
# Unhealthy targets
Files: sg.tf, tg.tf, healthcheck.tf

1. Health checks time out: the instance security group allows 80, not 8080
2. After that: the target group points to port 80 while the app is on 8080
3. After that: 404 on /healthz, the app serves /health

@@ file /home/user/ms-lb-health-chain/sg.tf
ingress {
  from_port = 80
  to_port   = 80
  protocol  = "tcp"
}

@@ file /home/user/ms-lb-health-chain/tg.tf
resource "aws_lb_target_group" "app" {
  port     = 80
  protocol = "HTTP"
}

@@ file /home/user/ms-lb-health-chain/healthcheck.tf
health_check {
  path = "/healthz"
}

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-lb-health-chain/sg.tf",
  "label": "the security group allows port 8080",
  "re": "from_port = 8080"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-lb-health-chain/sg.tf",
  "label": "the security group allows port 8080 (old value removed)",
  "re": "from_port = 80\\b",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-lb-health-chain/tg.tf",
  "label": "the target group uses port 8080",
  "re": "port\\s+= 8080"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-lb-health-chain/tg.tf",
  "label": "the target group uses port 8080 (old value removed)",
  "re": "port\\s+= 80\\b",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-lb-health-chain/healthcheck.tf",
  "label": "the health check path is /health",
  "re": "path = \"/health\""
 },
 {
  "t": "contains",
  "path": "/home/user/ms-lb-health-chain/healthcheck.tf",
  "label": "the health check path is /health (old value removed)",
  "re": "/healthz",
  "not": true
 }
]
@@ explain
Three layers each have a port or path. A health check needs network access, the right port and the right path, in that order. Terraform plan shows what changes, but only a request shows what is true.
@@ solution
cat symptoms.md
cat sg.tf
sed -i 's#from_port = 80#from_port = 8080#; s#to_port   = 80#to_port   = 8080#' sg.tf
cat tg.tf
sed -i 's#port     = 80#port     = 8080#' tg.tf
cat healthcheck.tf
sed -i 's#/healthz#/health#' healthcheck.tf
cat sg.tf


## Certificate renewed but site still shows the old one
id: ms-cert-renewal
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A renewal hook, an nginx path and a reload step break the chain.
@@ story
The new certificate was issued, yet browsers still see the expired one. The hook that copies it, the nginx file path and the reload each have a fault.
@@ goals
- Layer 1: the hook copies to fullchain.pem
- Layer 2: nginx reads fullchain.pem
- Layer 3: the hook tests and reloads nginx
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- renew-hook.sh: s#fullchian#fullchain#
@@ world
{"cwd": "/home/user/ms-cert-renewal"}
@@ file /home/user/ms-cert-renewal/symptoms.md
# Old certificate served
Files: renew-hook.sh, nginx-ssl.conf, cron

1. The hook copies to /etc/ssl/site/fullchian.pem (typo)
2. nginx reads /etc/ssl/site/privkey.pem and an old fullchain path
3. The hook never reloads nginx

@@ file /home/user/ms-cert-renewal/renew-hook.sh
#!/bin/sh
cp /etc/letsencrypt/live/site/fullchain.pem /etc/ssl/site/fullchian.pem

@@ file /home/user/ms-cert-renewal/nginx-ssl.conf
ssl_certificate     /etc/ssl/site/old-fullchain.pem;
ssl_certificate_key /etc/ssl/site/privkey.pem;

@@ file /home/user/ms-cert-renewal/reload.sh
#!/bin/sh
# reload after renewal

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-cert-renewal/renew-hook.sh",
  "label": "the hook copies to fullchain.pem",
  "re": "site/fullchain\\.pem"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-cert-renewal/renew-hook.sh",
  "label": "the hook copies to fullchain.pem (old value removed)",
  "re": "fullchian",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-cert-renewal/nginx-ssl.conf",
  "label": "nginx reads fullchain.pem",
  "re": "ssl_certificate\\s+/etc/ssl/site/fullchain\\.pem"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-cert-renewal/nginx-ssl.conf",
  "label": "nginx reads fullchain.pem (old value removed)",
  "re": "old-fullchain",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-cert-renewal/reload.sh",
  "label": "the hook tests and reloads nginx",
  "re": "nginx -t\\s+&&\\s+systemctl reload nginx"
 }
]
@@ explain
Renewal is a chain: issue, copy, reference, reload. A break anywhere keeps the old certificate in use. Always test the configuration and reload, and monitor the certificate the world sees.
@@ solution
cat symptoms.md
cat renew-hook.sh
sed -i 's#fullchian#fullchain#' renew-hook.sh
cat nginx-ssl.conf
sed -i 's#old-fullchain#fullchain#' nginx-ssl.conf
cat reload.sh
sed -i '$a nginx -t \&\& systemctl reload nginx' reload.sh
cat renew-hook.sh


## Disk fills overnight and takes the database down
id: ms-disk-full-cascade
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: Debug logging, missing rotation and a late alert let the disk fill.
@@ story
The server ran out of disk at 03:00. A debug log level, no rotation rule and an alert threshold of 99 percent combined to cause it.
@@ goals
- Layer 1: production logs at info level
- Layer 2: logs rotate daily, keep 7 and compress
- Layer 3: the disk alert fires at 80 percent
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- app.conf: s#level = debug#level = info#
@@ world
{"cwd": "/home/user/ms-disk-full-cascade"}
@@ file /home/user/ms-disk-full-cascade/symptoms.md
# Disk full
Files: app.conf, logrotate-app, alert.yaml

1. app.conf sets level=debug in production, writing 20 GB a day
2. logrotate has no rotate or maxsize, so the log grows without bound
3. The disk alert fires at 99 percent, too late to act

@@ file /home/user/ms-disk-full-cascade/app.conf
[logging]
level = debug

@@ file /home/user/ms-disk-full-cascade/logrotate-app
/var/log/app/app.log {
  daily
}

@@ file /home/user/ms-disk-full-cascade/alert.yaml
- alert: DiskFull
  expr: disk_used_percent > 99

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-disk-full-cascade/app.conf",
  "label": "production logs at info level",
  "re": "level = info"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-disk-full-cascade/app.conf",
  "label": "production logs at info level (old value removed)",
  "re": "debug",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-disk-full-cascade/logrotate-app",
  "label": "logs rotate daily, keep 7 and compress",
  "re": "rotate 7"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-disk-full-cascade/alert.yaml",
  "label": "the disk alert fires at 80 percent",
  "re": "disk_used_percent > 80"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-disk-full-cascade/alert.yaml",
  "label": "the disk alert fires at 80 percent (old value removed)",
  "re": "> 99",
  "not": true
 }
]
@@ explain
Disks fill because of rates. Reduce the rate of writes, bound the retention, and alert early enough to act. Any one fix helps; all three prevent the repeat.
@@ solution
cat symptoms.md
cat app.conf
sed -i 's#level = debug#level = info#' app.conf
cat logrotate-app
sed -i 's#daily#daily\n  rotate 7\n  compress\n  maxsize 500M#' logrotate-app
cat alert.yaml
sed -i 's#> 99#> 80#' alert.yaml
cat app.conf


## After failover the app still writes to the old primary
id: ms-db-failover-stale
module: multi
level: Advanced
minutes: 18
lesson: 
engine: Simulated Linux shell with configuration files from several layers
summary: A hard-coded IP, a DNS TTL and a pooler setting make a failover ineffective.
@@ story
The database failed over to a replica, but the app keeps erroring with read-only transaction errors. It connects by IP, DNS has a long TTL, and the pooler keeps old connections.
@@ goals
- Layer 1: the app connects by the stable name
- Layer 2: the record has a short TTL of 30 seconds
- Layer 3: the pooler recycles connections and checks them
@@ hints
- Start with `cat symptoms.md`. It lists the request path from the outside in.
- Fix one layer at a time and read the next file. A fix in one layer shows the next fault.
- app.env: s#DB_HOST=10.0.2.10#DB_HOST=db-primary.internal#
@@ world
{"cwd": "/home/user/ms-db-failover-stale"}
@@ file /home/user/ms-db-failover-stale/symptoms.md
# Stale primary
Files: app.env, dns-record.txt, pgbouncer.ini

1. DB_HOST is the old primary IP 10.0.2.10
2. The DNS record db-primary has TTL 3600
3. server_lifetime in the pooler is 0 (connections never recycled) and server_check_query is empty

@@ file /home/user/ms-db-failover-stale/app.env
DB_HOST=10.0.2.10
DB_PORT=5432

@@ file /home/user/ms-db-failover-stale/dns-record.txt
db-primary.internal. 3600 IN A 10.0.2.11

@@ file /home/user/ms-db-failover-stale/pgbouncer.ini
[pgbouncer]
server_lifetime = 0
server_check_query =

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ms-db-failover-stale/app.env",
  "label": "the app connects by the stable name",
  "re": "DB_HOST=db-primary\\.internal"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-db-failover-stale/app.env",
  "label": "the app connects by the stable name (old value removed)",
  "re": "10\\.0\\.2\\.10",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-db-failover-stale/dns-record.txt",
  "label": "the record has a short TTL of 30 seconds",
  "re": "IN A.*|db-primary\\.internal\\. 30 IN A"
 },
 {
  "t": "contains",
  "path": "/home/user/ms-db-failover-stale/dns-record.txt",
  "label": "the record has a short TTL of 30 seconds (old value removed)",
  "re": "3600",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/ms-db-failover-stale/pgbouncer.ini",
  "label": "the pooler recycles connections and checks them",
  "re": "server_check_query = select 1"
 }
]
@@ explain
A failover only helps if clients follow it: use names, keep TTLs short, and make poolers drop broken connections. Test the whole path with a rehearsed failover.
@@ solution
cat symptoms.md
cat app.env
sed -i 's#DB_HOST=10.0.2.10#DB_HOST=db-primary.internal#' app.env
cat dns-record.txt
sed -i 's#3600#30#' dns-record.txt
cat pgbouncer.ini
sed -i 's#server_lifetime = 0#server_lifetime = 600#; s#server_check_query =#server_check_query = select 1#' pgbouncer.ini
cat app.env

