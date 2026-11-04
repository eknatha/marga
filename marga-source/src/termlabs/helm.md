## Install fails: replicas is text
id: helm-replicas-text
module: helm
level: Beginner
minutes: 10
lesson: helm/debugging-helm-releases
engine: Simulated Helm and a chart folder
summary: helm install fails because a value has the wrong type. Read the error, fix the value and install.
@@ story
The chart in the shop folder will not install. Your teammate set the number of replicas in values.yaml as a word. helm template still prints YAML, but the cluster rejects it. Fix the value and install the release named shop.
@@ goals
- Find the error with helm install.
- Correct the replicas value.
- Get shop deployed so that helm status shows deployed.
@@ hints
- The error mentions cannot unmarshal string into replicas of type int32.
- `grep -n replicas shop/values.yaml` shows the value.
- Set replicas to a number with sed. The failed install left a release behind, so use `helm upgrade --install shop ./shop`.
@@ file /home/user/shop/Chart.yaml
apiVersion: v2
name: shop
description: The shop web service
version: 0.3.0
appVersion: "1.4.0"

@@ file /home/user/shop/values.yaml
replicas: three
image:
  tag: "1.4.0"

@@ file /home/user/shop/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicas }}
  template:
    spec:
      containers:
        - name: web
          image: shop:{{ .Values.image.tag }}
          ports:
            - containerPort: 8080

@@ world
{"cwd": "/home/user", "more": {"helm": {"releases": {}}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/shop/values.yaml",
  "label": "replicas is a number",
  "re": "replicas:\\s*\\d+\\s*$"
 },
 {
  "t": "cmd",
  "run": "helm status shop",
  "code": 0,
  "label": "shop is deployed",
  "out": "STATUS: deployed"
 }
]
@@ explain
helm template renders text and does not talk to the cluster, so it cannot catch wrong types. The cluster validates the objects on install. When an install fails, helm records a failed release, so a plain second install says the name is in use. helm upgrade --install fixes the release in place, and helm list --all shows failed releases.
@@ solution
helm template shop ./shop | head -20
helm install shop ./shop
sed -i 's/replicas: .*/replicas: 3/' shop/values.yaml
helm upgrade --install shop ./shop


## Lint fails: a required value is missing
id: helm-lint-required
module: helm
level: Beginner
minutes: 10
lesson: helm/templates-and-the-go-template-language
engine: Simulated Helm and a chart folder
summary: The chart refuses to render without a database host. Provide it in values the way an environment would.
@@ story
Your chart uses required so that nobody deploys without a database host. helm lint stops with an error. Add a host for the staging database, db.staging.internal, to values.yaml and make lint pass.
@@ goals
- Run helm lint and read the message.
- Add database.host to values.yaml.
- Finish with helm lint passing.
@@ hints
- The message says which value is required and which template asked.
- values.yaml needs a database section with a host key.
- `printf 'database:\n  host: db.staging.internal\n' >> shop/values.yaml` appends it.
@@ file /home/user/shop/Chart.yaml
apiVersion: v2
name: shop
description: The shop web service
version: 0.3.0
appVersion: "1.4.0"

@@ file /home/user/shop/values.yaml
replicas: 2
image:
  tag: "1.4.0"

@@ file /home/user/shop/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicas }}
  template:
    spec:
      containers:
        - name: web
          image: shop:{{ .Values.image.tag }}
          ports:
            - containerPort: 8080
          env:
            - name: DB_HOST
              value: {{ required "database.host is required" .Values.database.host | quote }}

@@ world
{"cwd": "/home/user", "more": {"helm": {"releases": {}}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/shop/values.yaml",
  "label": "values.yaml sets database.host",
  "re": "host:\\s*db\\.staging\\.internal"
 },
 {
  "t": "cmd",
  "run": "helm lint ./shop",
  "code": 0,
  "label": "helm lint passes",
  "out": "0 chart\\(s\\) failed"
 }
]
@@ explain
required fails the render with your message when a value is empty, which turns a silent mistake into a clear error at lint time. Defaults belong in values.yaml, environment specifics in a values file per environment. Keep real secrets out of both.
@@ solution
helm lint ./shop
printf 'database:\n  host: db.staging.internal\n' >> shop/values.yaml
helm lint ./shop


## The new release is broken: go back
id: helm-rollback
module: helm
level: Intermediate
minutes: 10
lesson: helm/upgrade-rollback-and-release-history
engine: Simulated Helm and a chart folder
summary: An upgrade left the release in a failed state. Read the history and roll back to the last good revision.
@@ story
Revision 2 of shop was an upgrade to image 1.5.0 that failed. Users are still being served by the old pods, but the release is marked failed and the next deploy will be confusing. Roll back to the last good revision and prove that the release is healthy again.
@@ goals
- Read helm history for the release shop.
- Roll back to the last good revision.
- Confirm that helm status shows deployed and the manifest has image shop:1.4.0.
@@ hints
- `helm history shop` lists every revision with its status and description.
- Revision 1 is the last one marked superseded after a successful deploy.
- `helm rollback shop 1` creates a new revision that copies revision 1.
@@ world
{"cwd": "/home/user", "more": {"helm": {"releases": {"default/shop": {"ns": "default", "name": "shop", "revs": [{"rev": 1, "chart": "shop-0.3.0", "appVersion": "1.4.0", "values": {"replicas": 3, "image": {"tag": "1.4.0"}}, "user": {}, "manifest": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop\nspec:\n  replicas: 3\n  template:\n    spec:\n      containers:\n        - name: web\n          image: shop:1.4.0\n", "status": "superseded", "desc": "Install complete", "updated": "Tue Nov  3 09:10:00 2026"}, {"rev": 2, "chart": "shop-0.4.0", "appVersion": "1.5.0", "values": {"replicas": 3, "image": {"tag": ""}}, "user": {}, "manifest": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop\nspec:\n  replicas: 3\n  template:\n    spec:\n      containers:\n        - name: web\n          image: shop:\n", "status": "failed", "desc": "Upgrade \"shop\" failed: Pod \"app\" is invalid: spec.containers[0].image: Invalid value: \"shop:\": invalid reference format", "updated": "Tue Nov  3 11:42:00 2026"}]}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "helm status shop",
  "code": 0,
  "label": "the release is deployed",
  "out": "STATUS: deployed"
 },
 {
  "t": "cmd",
  "run": "helm get manifest shop",
  "code": 0,
  "label": "the manifest uses image 1.4.0",
  "out": "shop:1\\.4\\.0"
 }
]
@@ explain
Every install, upgrade and rollback is a new revision, and the history keeps them all. A rollback does not rewind the counter. It creates the next revision with the old content. This is why history is the first place to look when a release misbehaves. Fixing the chart and upgrading again is the other way forward.
@@ solution
helm history shop
helm rollback shop 1
helm status shop
helm get manifest shop


## Production got development values
id: helm-prod-values
module: helm
level: Intermediate
minutes: 10
lesson: helm/values-per-environment-and-secrets
engine: Simulated Helm and a chart folder
summary: The production release runs one replica because nobody passed the production values file. Upgrade with it.
@@ story
The shop release in production is serving traffic with one replica, the default from values.yaml. The team keeps production settings in values-prod.yaml. Upgrade the release so it uses that file, without editing the chart defaults.
@@ goals
- Compare values.yaml and values-prod.yaml.
- Upgrade the release with the production file.
- Confirm that the manifest has five replicas.
@@ hints
- `cat shop/values-prod.yaml` shows the production overrides.
- `-f FILE` adds a values file. Later files override earlier ones.
- `helm upgrade shop ./shop -f shop/values-prod.yaml`, then `helm get manifest shop`.
@@ file /home/user/shop/Chart.yaml
apiVersion: v2
name: shop
description: The shop web service
version: 0.3.0
appVersion: "1.4.0"

@@ file /home/user/shop/values.yaml
replicas: 1
image:
  tag: "1.4.0"

@@ file /home/user/shop/values-prod.yaml
replicas: 5

@@ file /home/user/shop/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicas }}
  template:
    spec:
      containers:
        - name: web
          image: shop:{{ .Values.image.tag }}
          ports:
            - containerPort: 8080

@@ world
{"cwd": "/home/user", "more": {"helm": {"releases": {"default/shop": {"ns": "default", "name": "shop", "revs": [{"rev": 1, "chart": "shop-0.3.0", "appVersion": "1.4.0", "values": {"replicas": 1, "image": {"tag": "1.4.0"}}, "user": {}, "manifest": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop\nspec:\n  replicas: 1\n  template:\n    spec:\n      containers:\n        - name: web\n          image: shop:1.4.0\n", "status": "deployed", "desc": "Install complete", "updated": "Tue Nov  3 09:10:00 2026"}]}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "helm get manifest shop",
  "code": 0,
  "label": "the release runs five replicas",
  "out": "replicas: 5"
 },
 {
  "t": "contains",
  "path": "/home/user/shop/values.yaml",
  "label": "chart defaults were not edited",
  "re": "replicas:\\s*1\\s*$"
 }
]
@@ explain
Chart defaults stay small and safe, and each environment adds a values file on top. Order matters: files are merged left to right, and --set wins over files. Keeping environment values in version control makes a release repeatable. Helm get values shows what was supplied.
@@ solution
cat shop/values-prod.yaml
helm upgrade shop ./shop -f shop/values-prod.yaml
helm get manifest shop


## The template renders an empty image tag
id: helm-template-typo
module: helm
level: Intermediate
minutes: 12
lesson: helm/installing-charts-and-values
engine: Simulated Helm and a chart folder
summary: A typo in a template makes the image tag empty. Find it with helm template and fix it in the template, not in the values.
@@ story
The upgrade failed because the rendered image is shop: with no tag. The values file is correct. Use helm template to see what the chart really produces, find the misspelled value in the template and fix it there.
@@ goals
- Render the chart with helm template and look at the image line.
- Fix the template so it reads the right value.
- Install shop so it is deployed with image shop:1.4.0.
@@ hints
- `helm template shop ./shop | grep image` shows image: shop:.
- `grep -n Values shop/templates/deployment.yaml` shows which value the template reads.
- The template says .Values.image.tagg. Change it to .Values.image.tag with sed.
@@ file /home/user/shop/Chart.yaml
apiVersion: v2
name: shop
description: The shop web service
version: 0.3.0
appVersion: "1.4.0"

@@ file /home/user/shop/values.yaml
replicas: 3
image:
  tag: "1.4.0"

@@ file /home/user/shop/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicas }}
  template:
    spec:
      containers:
        - name: web
          image: shop:{{ .Values.image.tagg }}
          ports:
            - containerPort: 8080

@@ world
{"cwd": "/home/user", "more": {"helm": {"releases": {}}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/shop/templates/deployment.yaml",
  "label": "the template reads .Values.image.tag",
  "re": "\\.Values\\.image\\.tag\\s*\\}\\}"
 },
 {
  "t": "cmd",
  "run": "helm get manifest shop",
  "code": 0,
  "label": "shop runs image 1.4.0",
  "out": "shop:1\\.4\\.0"
 },
 {
  "t": "cmd",
  "run": "helm status shop",
  "code": 0,
  "label": "shop is deployed",
  "out": "STATUS: deployed"
 }
]
@@ explain
A missing value renders as an empty string, not an error, unless you use required. helm template is the fastest way to see what will be sent, because it needs no cluster. The fix belongs in the template, since values.yaml was right all along.
@@ solution
helm template shop ./shop | grep image
grep -n Values shop/templates/deployment.yaml
sed -i 's/image.tagg/image.tag/' shop/templates/deployment.yaml
helm install shop ./shop

