#!/usr/bin/env python3
"""Build the two 60-day plans into src/plans/plans-60.json"""
import json, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src/plans/plans-60.json')
TERM = {'linux','bash','networking','python','kubernetes','docker','cloud'}
LABEL = {'linux':'Linux','bash':'the shell','networking':'networking','docker':'containers','kubernetes':'Kubernetes','observability':'telemetry','sre':'reliability','git':'Git','cicd':'pipelines','terraform':'infrastructure as code','k8s-ops':'cluster operations','system-design':'system design','cloud':'cloud','security':'security'}
def day(spec):
    items=[]; title=None; practice=False
    for tok in spec.split(' ; '):
        k,v=tok.split(':',1)
        if k=='L': items.append({'t':'lesson','id':v})
        elif k=='W': items.append({'t':'widget','id':v})
        elif k=='P':
            practice=True; title='Practice and review: '+LABEL[v]
            items=[{'t':'drills','module':v},{'t':'cases','module':v},
                   {'t':'link','href':'#/terminal-labs/'+v if v in TERM else '#/games','text':'Do a terminal lab' if v in TERM else 'Play an incident game','min':20 if v in TERM else 15},
                   {'t':'link','href':'#/flashcards','text':'Review your flashcards','min':10}]
        elif k=='F':
            practice=True; title='Final review: '+v
            items=[{'t':'cases','module':'sre' if v=='SRE' else 'cicd'},{'t':'link','href':'#/capstones','text':'Pick a capstone project for your portfolio','min':30},{'t':'link','href':'#/games','text':'Play an incident game','min':15},{'t':'link','href':'#/flashcards','text':'Review your flashcards','min':10}]
    d={'title':title,'items':items}
    if practice: d['practice']=True
    return d
SRE = """L:linux/processes-and-services ; W:oom-killer
L:linux/logs-and-troubleshooting
L:linux/performance-triage ; W:load-average
L:linux/troubleshooting-playbook-method-and-first-five-minutes
L:linux/troubleshooting-playbook-high-load-and-cpu-saturation
L:linux/troubleshooting-playbook-memory-pressure-swap-and-the-oom-killer ; W:page-cache
P:linux
L:networking/ip-addressing-and-subnets
L:networking/dns ; W:dns-ttl
L:networking/http-and-tls
L:networking/troubleshooting-toolkit ; W:tcp-handshake
L:networking/debugging-network-problems
L:bash/log-analysis-one-liners-and-pipelines
P:networking
L:docker/containers-and-images
L:docker/running-containers-in-production ; W:container-limits
L:kubernetes/architecture
L:kubernetes/pods-and-deployments ; W:rolling-update
L:kubernetes/resources-and-quotas ; W:requests-bin-packing
L:kubernetes/scheduling-and-troubleshooting
L:kubernetes/probes-metrics-and-logging ; W:liveness-cascade
P:kubernetes
L:kubernetes/debugging-kubernetes-workloads
L:k8s-ops/etcd-backup-and-restore ; W:etcd-quorum
L:k8s-ops/control-plane-monitoring-and-slos
L:k8s-ops/cluster-disaster-recovery-runbook
L:observability/observability-fundamentals ; W:metric-cardinality
P:k8s-ops
L:observability/metrics-and-prometheus
L:observability/logs-and-traces ; W:trace-sampling
L:observability/alerting-and-dashboards ; W:alert-window
L:observability/red-use-and-golden-signals
L:observability/telemetry-cost-and-cardinality ; W:log-volume
L:observability/runbooks-and-dashboards-for-on-call
P:observability
L:observability/debugging-with-telemetry
L:sre/slos-and-error-budgets ; W:error-budget
L:sre/incident-response ; W:mttr-breakdown
L:sre/postmortems-and-toil
L:sre/reliability-patterns
L:sre/on-call ; W:oncall-load
P:sre
L:sre/capacity-planning ; W:capacity-runway
L:sre/chaos-engineering-and-game-days
L:sre/change-management-and-releases
L:sre/production-readiness-reviews
L:sre/incident-communication-and-stakeholders
L:sre/dependencies-and-third-party-risk
P:cicd
L:sre/disaster-recovery-exercises
L:sre/debugging-under-pressure
L:system-design/failure-domains-cells-and-bulkheads
L:system-design/graceful-degradation-and-circuit-breakers ; W:retry-storm
L:system-design/rate-limiting-and-load-shedding ; W:token-bucket
L:terraform/iac-and-hcl-basics
P:system-design
L:cicd/deployment-strategies ; W:canary-exposure
L:cicd/environments-promotion-and-approvals
L:security/vulnerability-management-and-security-incidents
F:SRE""".split('\n')
DEV = """L:linux/filesystem-and-navigation
L:linux/users-groups-permissions
L:linux/processes-and-services ; W:oom-killer
L:linux/package-management
L:linux/ssh-and-remote-access
L:linux/logs-and-troubleshooting ; W:load-average
P:linux
L:bash/script-basics
L:bash/control-flow-and-functions
L:bash/text-processing ; W:shell-exit-codes
L:bash/safe-automation ; W:atomic-write
L:git/first-repository-and-commits
L:git/staging-undoing-and-stashing
P:git
L:git/branches-and-merging ; W:git-rebase-merge
L:git/remotes-fetch-pull-and-push
L:git/team-workflows-pull-requests-and-reviews
L:networking/ip-addressing-and-subnets
L:networking/dns ; W:dns-ttl
L:networking/http-and-tls
P:networking
L:docker/containers-and-images
L:docker/writing-dockerfiles ; W:docker-layer-cache
L:docker/volumes-and-networking
L:docker/compose
L:docker/registries-and-supply-chain
L:docker/security-and-troubleshooting
P:docker
L:cicd/pipeline-fundamentals
L:cicd/building-a-pipeline ; W:pipeline-speed
L:cicd/testing-and-quality-gates ; W:flaky-tests
L:cicd/deployment-strategies
L:cicd/actions-workflows-jobs-and-steps
L:cicd/gitlab-ci-pipelines-stages-and-jobs
P:cicd
L:kubernetes/architecture
L:kubernetes/pods-and-deployments ; W:rolling-update
L:kubernetes/services-and-ingress
L:kubernetes/config-and-secrets
L:kubernetes/resources-and-quotas ; W:requests-bin-packing
L:kubernetes/probes-metrics-and-logging
P:kubernetes
L:terraform/iac-and-hcl-basics
L:terraform/providers-and-resources
L:terraform/variables-and-outputs
L:terraform/state ; W:tf-drift-window
L:terraform/modules
L:cloud/cloud-fundamentals
P:terraform
L:cloud/identity-and-access
L:observability/observability-fundamentals ; W:metric-cardinality
L:observability/metrics-and-prometheus
L:observability/alerting-and-dashboards ; W:alert-window
L:security/security-mindset-and-threat-modeling
L:security/secrets-management ; W:secret-rotation-effort
P:cloud
L:argocd/pull-based-delivery-and-the-repository-as-source-of-truth
L:sre/slos-and-error-budgets ; W:error-budget
L:sre/incident-response
F:DevOps""".split('\n')
plans = [
 {'id':'sre-60','title':'Become an SRE in 60 days','summary':'Sixty days from Linux and networking through containers, Kubernetes, telemetry, SLOs, incidents and on-call, with one lesson a day and a review day each week.','level':'Intermediate','who':'Engineers who run production systems, or want to, and can already work at a Linux shell.','needs':['linux'],
  'outcomes':['Triage a sick Linux server and a failing network path with a fixed method.','Run workloads on Kubernetes and watch the control plane, nodes and telemetry.','Define SLOs and error budgets, run an incident and write a blameless post-mortem.','Plan capacity, change safely and keep an on-call rotation people can sustain.'],'days':[day(s) for s in SRE]},
 {'id':'devops-60','title':'Become a DevOps engineer in 60 days','summary':'Sixty days from the Linux shell and Git to containers, pipelines, Kubernetes, Terraform, cloud basics and monitoring, with one lesson a day and a review day each week.','level':'Beginner','who':'Developers, admins and career changers who want the core DevOps toolchain in two months.','needs':[],
  'outcomes':['Work confidently on Linux and automate tasks with safe shell scripts.','Use Git in a team and build container images and delivery pipelines.','Deploy and debug applications on Kubernetes and describe infrastructure as code.','Add monitoring, secrets handling and reliability habits to everything you ship.'],'days':[day(s) for s in DEV]},
]
for p in plans: assert len(p['days'])==60, (p['id'], len(p['days']))
json.dump(plans, open(OUT,'w'), indent=1, ensure_ascii=False)
print('ok', [len(p['days']) for p in plans])
