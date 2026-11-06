import json
T=[]
def st(title,goal,learn,build,check,keep):
    return dict(title=title,goal=goal,learn=learn,build=build,check=check,keep=keep)
T.append(dict(id='ship-a-service',title='Ship a service from commit to cluster',level='Beginner to intermediate',hours=24,
 summary='Take one small web service from a laptop to a running Kubernetes deployment, with a container, a pipeline, infrastructure as code and a rollback you have tried.',
 who='Anyone aiming at a DevOps engineer role who wants one finished project to show.',
 needs='A laptop with Docker and a free Git host account. Everything runs locally with kind, so no cloud bill.',
 outcome='A repository with a tested service, a hardened image, a CI pipeline, a Terraform module, a Kubernetes manifest set and a written rollback.',
 tools=['Docker','kind','kubectl','Terraform','GitHub Actions or GitLab CI'],
 stages=[
 st('Write the service and its tests','A small HTTP service with a health endpoint and three tests that run in under ten seconds.',
  ['cicd/pipeline-fundamentals','cicd/testing-and-quality-gates'],
  ['Create a repository with a service in any language you know: GET /healthz, GET /items, POST /items.','Add three tests: health returns 200, create then list returns the item, bad input returns 400.','Add a Makefile with test, run and lint targets so every later stage calls the same commands.'],
  ['make test passes from a clean clone','The service starts with one command and answers /healthz','The repository has a README with the run and test commands'],
  'The repository, with the Makefile and the tests.'),
 st('Package it as a small, safe image','A multi-stage image that runs as a non-root user and starts in under a second.',
  ['docker/containers-and-images','docker/writing-dockerfiles','docker/security-and-troubleshooting','docker/slim-images-and-faster-builds'],
  ['Write a multi-stage Dockerfile: build in one stage, copy only the result into a slim final stage.','Set a non-root USER, a HEALTHCHECK and a read-only root filesystem when you run it.','Add a .dockerignore and order layers so a code change does not reinstall dependencies.','Write a compose file with the service and a database, and bring it up with one command.'],
  ['docker run --read-only starts the service','docker image ls shows the final image well under the build image size','Rebuilding after a one-line code change reuses the dependency layer'],
  'Dockerfile, .dockerignore and compose.yaml in the repository.'),
 st('Build the pipeline','A pipeline that tests, builds and pushes the image on every push, and blocks a bad change.',
  ['cicd/building-a-pipeline','cicd/versioning-and-artifacts','cicd/pipeline-security','cicd/actions-workflows-jobs-and-steps'],
  ['Create a pipeline with three jobs: test, build image, push image. The push job runs only on the main branch.','Tag images with the commit hash, never only latest.','Store registry credentials as pipeline secrets and keep them out of logs.','Add a vulnerability scan of the image and fail the job on a critical finding.','Open a pull request that breaks a test and confirm the pipeline blocks it.'],
  ['A failing test stops the pipeline before the image is built','The pushed image is tagged with the commit hash','No secret value appears in any job log'],
  'The pipeline file and a link to one green and one red run.'),
 st('Describe the infrastructure as code','A Terraform module that creates the cluster and namespace the service runs in.',
  ['terraform/iac-and-hcl-basics','terraform/variables-and-outputs','terraform/state','terraform/modules'],
  ['Write a Terraform module that creates a kind cluster (or a namespace on one you already have) from variables.','Expose the cluster name and kubeconfig path as outputs.','Run plan, apply, then plan again and confirm the second plan shows no changes.','Change one variable, read the plan, and apply it.','Destroy it and recreate it from scratch to prove nothing was done by hand.'],
  ['The second plan reports no changes','Destroy and apply recreates the cluster with no manual steps','State is not committed to the repository'],
  'infra/ directory with the module, a variables example and a short README.'),
 st('Deploy to Kubernetes','The service running as a Deployment behind a Service, with probes, limits and configuration.',
  ['kubernetes/pods-and-deployments','kubernetes/services-and-ingress','kubernetes/config-and-secrets','kubernetes/resources-and-quotas','kubernetes/probes-metrics-and-logging'],
  ['Write a Deployment with three replicas, readiness and liveness probes on /healthz, and CPU and memory requests and limits.','Add a Service and an Ingress or port-forward, and reach the service from outside the pod.','Move configuration into a ConfigMap and the database password into a Secret.','Kill a pod and watch the Deployment replace it without dropped requests.','Add the apply step to the pipeline for the main branch.'],
  ['kubectl rollout status finishes cleanly','Deleting a pod causes no failed requests while two others serve','No credential is written in plain text in a manifest'],
  'k8s/ directory with the manifests, applied by the pipeline.'),
 st('Roll out, break it and roll back','A rolling update, a deliberately bad release, and a rollback you can do in under two minutes.',
  ['cicd/deployment-strategies','cicd/release-management-and-feature-flags','kubernetes/debugging-kubernetes-workloads','cicd/debugging-pipelines'],
  ['Release version 2 with a rolling update and watch old and new pods overlap.','Release a version 3 that fails its readiness probe and confirm traffic stays on version 2.','Roll back with kubectl rollout undo and time it.','Write a one-page runbook: how to see what changed, how to roll back, how to confirm recovery.','Add a feature flag so one behaviour can be switched off without a deploy.'],
  ['A bad release never receives traffic','Rollback restores the previous version in under two minutes','The runbook lets someone else do the rollback without you']
  ,'RUNBOOK.md in the repository and a short description of what you would change next.'),
 ]))
T.append(dict(id='run-it-reliably',title='Run a service reliably',level='Intermediate',hours=26,
 summary='Define reliability for a small service, measure it, alert on it, break it on purpose and write up what happened, the way an SRE team works.',
 who='Anyone aiming at an SRE role, or an engineer who now carries a pager.',
 needs='Docker and Docker Compose on a laptop. Prometheus and Grafana run locally from containers.',
 outcome='A service with written SLOs, working metrics and burn-rate alerts, an on-call runbook, a game-day report and a postmortem.',
 tools=['Docker Compose','Prometheus','Grafana','a load generator such as hey or k6'],
 stages=[
 st('Pick the user journeys and write SLOs','Two SLIs and two SLOs with an error budget in minutes, agreed in writing.',
  ['sre/slos-and-error-budgets','observability/red-use-and-golden-signals'],
  ['Run a small web service with Compose (any service with a database works).','List the two journeys users care about most and write an SLI for each: for example, requests under 300 ms and non-error responses.','Set SLO targets, for example 99.5 percent over 28 days, and convert each to an error budget in minutes.','Write down what the team does when the budget is spent.'],
  ['Each SLI is a ratio of good events to valid events','The error budget is stated in minutes and in requests','The budget policy says who decides and what stops'],
  'SLO.md with SLIs, targets, budget and policy.'),
 st('Instrument and measure','Prometheus scraping request rate, errors and latency, with a Grafana dashboard per journey.',
  ['observability/metrics-and-prometheus','observability/structured-logging-and-log-design','observability/alerting-and-dashboards'],
  ['Expose request count, error count and a latency histogram from the service.','Run Prometheus and Grafana beside it and confirm the targets are up.','Build a dashboard with rate, errors and p95 latency, and a panel for remaining error budget.','Switch the service to structured logs with a request id on every line.','Generate load and watch the graphs move.'],
  ['The dashboard shows the SLI exactly as SLO.md defines it','Logs carry a request id you can follow across lines','Cardinality is bounded: no user id or URL path as a label'],
  'Dashboard JSON and the Prometheus config in the repository.'),
 st('Alert on burn rate, not noise','Two burn-rate alerts, a fast one and a slow one, each with a link to a runbook.',
  ['observability/alerting-and-dashboards','sre/on-call','observability/runbooks-and-dashboards-for-on-call'],
  ['Write a fast alert (burning budget about 14 times too fast over one hour) and a slow alert (about 2 times over three days).','Route the fast alert to a page and the slow alert to a ticket.','Write a runbook per alert: what it means, how to check, how to fix, when to escalate.','Trigger each alert by injecting errors and confirm only the right one fires.'],
  ['A short error spike does not page anyone','A sustained burn pages within minutes','Every alert links to a runbook that names a first command to run'],
  'Alert rules and one runbook per alert.'),
 st('Make it resilient','Timeouts, retries with backoff and a health-based restart, shown to work under failure.',
  ['sre/reliability-patterns','sre/capacity-planning','sre/production-readiness-reviews'],
  ['Add a timeout to every outbound call and retries with exponential backoff and jitter, capped.','Add a circuit breaker or a load-shed rule for an overloaded dependency.','Run a load test to the point of failure and note the requests per second where latency breaks the SLO.','Write a short production readiness checklist and score your service against it.'],
  ['A slow dependency does not take the whole service down','You can state the capacity limit as a number','The readiness checklist has no unanswered item']
  ,'Load test results and the readiness checklist.'),
 st('Run a game day','A planned failure exercise with a hypothesis, a stop rule and a written result.',
  ['sre/chaos-engineering-and-game-days','sre/disaster-recovery-exercises','sre/debugging-under-pressure'],
  ['Write a hypothesis: for example, if the database is killed, the service degrades gracefully and recovers in under two minutes.','Define the stop rule before you start and who can call it.','Inject the failure: stop the database container, add 500 ms of latency, or fill the disk.','Record what you saw against the hypothesis and what surprised you.','Restore the database from a backup and time the restore.'],
  ['The hypothesis and stop rule were written before the test','The restore was actually performed and timed','At least one surprise led to a change']
  ,'GAMEDAY.md with hypothesis, timeline and result.'),
 st('Write the postmortem','A blameless postmortem of the game day with a timeline, causes and tracked actions.',
  ['sre/incident-response','sre/postmortems-and-toil','sre/incident-communication-and-stakeholders'],
  ['Write a timeline in UTC from the first symptom to full recovery.','List contributing causes, not a single root cause, and avoid naming a person as the cause.','Write three actions, each with an owner and a date, and at least one that removes toil.','Write the status update you would have sent to users during the incident.','Review how much error budget the incident would have used.'],
  ['The postmortem names no individual as the cause','Every action has an owner and a date','The budget impact is stated against SLO.md']
  ,'POSTMORTEM.md and the status update draft.'),
 ]))
T.append(dict(id='operate-a-cluster',title='Operate a Kubernetes cluster',level='Intermediate to advanced',hours=28,
 summary='Build a cluster, deliver apps with Helm and Argo CD, lock it down, back up etcd and rehearse a restore.',
 who='Anyone preparing for the CKA or taking on cluster operations.',
 needs='A laptop that can run kind or minikube with three nodes, or a free-tier virtual machine.',
 outcome='A multi-node cluster with delivered apps, access control, network policy, quotas, a tested etcd restore and an upgrade plan.',
 tools=['kind','kubectl','Helm','Argo CD','etcdctl'],
 stages=[
 st('Stand up the cluster','A three-node cluster and a clear picture of what runs the control plane.',
  ['kubernetes/architecture','k8s-ops/the-control-plane-in-depth','kubernetes/cluster-install-upgrade-etcd'],
  ['Create a cluster with one control plane node and two workers using a kind config file.','List the control plane components and find where each runs and where its logs are.','Find the etcd data directory and the certificate paths.','Label the workers and schedule a pod to one using nodeSelector.'],
  ['You can name each control plane component and what it does','kubectl get nodes shows three Ready nodes','The cluster config is a file in the repository, not a command history']
  ,'cluster.yaml and notes on the control plane.'),
 st('Deliver apps with Helm and Argo CD','An app installed from a chart and kept in sync from a Git repository.',
  ['helm/anatomy-of-a-chart','helm/values-per-environment-and-secrets','argocd/installing-argo-cd-and-the-application-resource','argocd/sync-health-and-drift'],
  ['Write a small chart with a Deployment, a Service and values for dev and prod.','Install Argo CD and create an Application that points at the chart in your repository.','Change a value in Git and watch Argo CD sync it.','Edit the live Deployment by hand and watch Argo CD report drift and fix it.','Roll back by reverting the commit.'],
  ['Argo CD shows Synced and Healthy','A manual change is reverted automatically','Reverting the commit restores the previous state']
  ,'charts/ and the Application manifest.'),
 st('Control who can do what','Role-based access for two teams and a service account with only the rights it needs.',
  ['k8s-ops/rbac-and-service-accounts','kubernetes/rbac-and-security','security/kubernetes-security'],
  ['Create two namespaces, team-a and team-b.','Write a Role and RoleBinding that let team-a edit only its own namespace.','Use kubectl auth can-i with --as to prove team-a cannot read team-b.','Create a service account for an app with read access to one ConfigMap and nothing else.','Enable Pod Security admission at the restricted level on one namespace and fix a failing pod.'],
  ['can-i answers match the policy you wrote','No workload uses the default service account','A privileged pod is refused in the restricted namespace']
  ,'rbac/ manifests and a table of who can do what.'),
 st('Isolate and share fairly','Default-deny network policy and quotas so one team cannot starve another.',
  ['k8s-ops/network-policies-and-pod-security','kubernetes/network-policies-in-practice','k8s-ops/resource-quotas-limits-and-autoscaling','k8s-ops/multi-tenancy-namespaces-and-fair-sharing'],
  ['Apply a default-deny ingress policy to team-a, then allow only the frontend to reach the API.','Test that a pod from team-b cannot reach team-a and that the frontend can.','Add a ResourceQuota and a LimitRange to each namespace.','Create a workload that exceeds the quota and read the refusal message.','Add a HorizontalPodAutoscaler and drive load until it scales.'],
  ['Cross-namespace traffic is blocked unless allowed','A quota breach is refused with a clear message','The autoscaler adds and then removes replicas']
  ,'policies/ and quota manifests.'),
 st('Back up and restore etcd','A snapshot taken on a schedule and a restore you have done and timed.',
  ['k8s-ops/etcd-backup-and-restore','k8s-ops/cluster-disaster-recovery-runbook','k8s-ops/persistent-storage-and-csi-operations'],
  ['Create a few objects, then take an etcd snapshot with etcdctl and verify it with snapshot status.','Delete a namespace and its workloads.','Restore the snapshot into a new data directory and point the control plane at it.','Confirm the objects are back and note how long it took.','Write the runbook, including where the snapshot is stored and who has access.'],
  ['The snapshot passes verification','The deleted objects were restored from it','The runbook was followed by you start to finish']
  ,'DR-RUNBOOK.md with timings.'),
 st('Upgrade and debug','A written upgrade plan, one node drained and upgraded, and three faults found and fixed.',
  ['k8s-ops/upgrading-clusters-safely','k8s-ops/nodes-draining-taints-and-capacity','k8s-ops/debugging-cluster-and-node-problems','kubernetes/debugging-kubernetes-workloads'],
  ['Write an upgrade plan: version skew rules, order of nodes, rollback point and checks after each step.','Cordon and drain a worker, confirm pods moved and PodDisruptionBudgets were respected, then uncordon.','Break three things on purpose (wrong image tag, failing probe, a node NotReady) and fix each from symptoms only.','Record the commands you used to diagnose each fault.'],
  ['The plan says what to check before and after each node','Drain respected the disruption budget','Each fault was found from events and logs, not by guessing']
  ,'UPGRADE.md and the fault notes.'),
 ]))
T.append(dict(id='cloud-landing-zone',title='Build a secure cloud landing zone',level='Intermediate',hours=26,
 summary='Design accounts, identity, networking, encryption, logging and cost controls as code, then test them by trying to break them.',
 who='Anyone aiming at a cloud engineer role on AWS or Azure.',
 needs='A free-tier cloud account, Terraform, and billing alerts switched on before you start.',
 outcome='A Terraform-defined foundation with least-privilege roles, a private network, encrypted storage, audit logging, guardrails and a cost budget.',
 tools=['Terraform','AWS or Azure CLI','a free-tier cloud account'],
 stages=[
 st('Plan accounts and guardrails','A written layout of accounts or subscriptions and the rules that apply to all of them.',
  ['cloud/landing-zones-and-multi-account-strategy','cloud-iam/permission-boundaries-scps-and-guardrails','cloud/security-and-governance'],
  ['Draw the layout: management, security and logging, shared services, and one workload account per environment.','Write the guardrails: no public storage, only approved regions, logging cannot be switched off.','Set a monthly budget with alerts at 50, 80 and 100 percent before creating anything.','Choose a tagging scheme: owner, environment, cost-centre.'],
  ['The layout explains why each account exists','Each guardrail is written as a testable statement','The budget alert exists before any resource']
  ,'DESIGN.md with the diagram, guardrails and tags.'),
 st('Identity with least privilege','Roles instead of long-lived keys, and a policy you reduced from broad to narrow.',
  ['cloud-iam/identities-principals-and-permissions','cloud-iam/aws-iam-policies-roles-and-assume-role','cloud-iam/least-privilege-and-access-reviews','cloud-iam/workload-identity-federation-and-oidc-trust'],
  ['Create a role for a deployment pipeline that can only deploy to one account.','Let the pipeline assume the role through OIDC so no access key is stored anywhere.','Start from a broad policy, run the access analyzer or policy simulator, and cut it down to what is used.','Turn on MFA for human users and remove any unused access keys.'],
  ['No long-lived key exists for the pipeline','The final policy names actions and resources, not wildcards','A denied action returns the error you expected']
  ,'iam/ Terraform and the before and after policies.'),
 st('A private network','A VPC or virtual network with public and private subnets and no open admin ports.',
  ['cloud/virtual-networks','cloud-iam/network-boundaries-and-private-access','cloud/hybrid-connectivity-and-peering'],
  ['Define the network in Terraform with CIDR ranges that leave room for growth and do not overlap other networks.','Place workloads in private subnets and reach the internet through a NAT or egress rule.','Allow administration through a managed session service, not an open SSH port.','Add private endpoints for storage so traffic stays off the internet.','Prove it: scan your own address space and confirm no admin port is reachable.'],
  ['No security group or rule allows 0.0.0.0/0 to an admin port','Storage is reached over a private endpoint','CIDR ranges are documented and do not overlap']
  ,'network/ Terraform and the CIDR table.'),
 st('Protect the data','Encrypted storage with customer-managed keys, versioning and a lifecycle rule.',
  ['cloud-iam/secrets-and-encryption-with-kms-and-key-vaults','cloud/object-storage-and-data-lifecycle','terraform/secrets-and-sensitive-data'],
  ['Create a storage bucket or account with public access blocked, versioning on and encryption using your own key.','Write a key policy that lets only one role decrypt.','Add a lifecycle rule that moves old data to cheaper storage and expires it later.','Store an application secret in a secrets manager and read it from a workload without writing it to disk.','Check that no secret appears in Terraform state or in plan output.'],
  ['Public access is blocked at account level','Only the named role can use the key','State and logs contain no secret value']
  ,'data/ Terraform with the key and lifecycle policy.'),
 st('See everything','Audit logs on, centralised, protected from deletion and searchable.',
  ['cloud-iam/logging-detection-audit-trails'.replace('detection-audit','detection-and-audit'),'cloud/monitoring-and-logging','security/detection-and-security-logging'],
  ['Enable the account audit trail in every region and send it to a bucket in the logging account.','Make the log bucket write-once or deny deletion for everyone except a break-glass role.','Create an alert for three events: root login, a policy change and a disabled trail.','Trigger each event on purpose and confirm the alert arrives.','Write the query you would run first after a suspected key leak.'],
  ['The trail covers all regions','Nobody in the workload account can delete the logs','Each alert fired when you triggered it']
  ,'logging/ Terraform and the alert tests.'),
 st('Control cost and recover','A cost report by tag, one rightsizing change and a tested recovery from a lost environment.',
  ['cloud/finops-reading-a-cloud-bill-and-tagging','cloud/finops-rightsizing-and-removing-waste','cloud/high-availability-and-disaster-recovery','terraform/workflows-and-drift'],
  ['Break down the bill by your tags and find any untagged spend.','Pick the largest resource, check its real use, and change its size.','Destroy the workload environment and recreate it from Terraform alone, timing it.','Run a plan and fix any drift between the code and the real resources.','Write down your recovery time and what is not yet covered.'],
  ['Untagged spend is zero or explained','The environment was rebuilt from code only','The recovery time is a measured number']
  ,'COST-AND-RECOVERY.md with the numbers.'),
 ]))
json.dump(T,open('src/tracks/tracks.json','w'),indent=1)
import subprocess,sys
subprocess.run([sys.executable,'tools/mkbreak.py'],check=True)
n=sum(len(t['stages']) for t in T);print(len(T),n)
