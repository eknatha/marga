---
title: CKA and CKS exam strategy
minutes: 14
summary: Prepare for the hands-on Kubernetes certifications with a speed setup, imperative commands, and a time plan, and see what each exam covers.
---

The Certified Kubernetes Administrator (CKA) and Certified Kubernetes Security Specialist (CKS) are performance-based exams: you solve tasks at a real terminal against real clusters, under a time limit. Knowing the material is not enough. Speed and accuracy at the command line decide the result.

## What you will learn

- What each exam tests
- Terminal setup that saves minutes
- Imperative commands that generate YAML
- A time-management plan

> **Exam tip:** Exam details change. Domain weights, the Kubernetes version, the allowed documentation and the passing score are published by the Linux Foundation and the CNCF. Check the current candidate handbook before you book, and treat the numbers in this lesson as an orientation only.

## What the exams cover

| | CKA | CKS |
|---|-----|-----|
| Focus | Administering a cluster | Securing a cluster and its workloads |
| Typical areas | Cluster setup and upgrades, workloads and scheduling, services and networking, storage, troubleshooting | Cluster hardening, system hardening, minimizing microservice vulnerabilities, supply chain security, monitoring and runtime security |
| Prerequisite | None | An active CKA |
| Format | Hands-on tasks in a browser terminal | Hands-on tasks in a browser terminal |

Every lesson in this module maps to CKA areas. The security lesson, plus topics such as audit logs, runtime detection and image scanning, build toward CKS.

## Terminal setup

Spend the first minute on a small set of aliases and completion. Many exam environments already provide `k` and completion, so check before typing.

```bash
alias k=kubectl
source <(kubectl completion bash)
complete -o default -F __start_kubectl k
export do="--dry-run=client -o yaml"
export now="--force --grace-period=0"
```

Configure `vim` for YAML so pasted indentation does not break:

```bash
cat > ~/.vimrc <<'EOF'
set expandtab
set tabstop=2
set shiftwidth=2
EOF
```

## Generate YAML, do not type it

Imperative commands create manifests for you in seconds. Redirect the output to a file, edit the few fields you need, then apply.

```console
$ k run web --image=nginx:1.27 $do > pod.yaml
$ k create deployment api --image=nginx:1.27 --replicas=3 $do > deploy.yaml
$ k expose deployment api --port=80 --target-port=8080 $do > svc.yaml
$ k create configmap cfg --from-literal=LOG_LEVEL=debug $do
$ k create role reader --verb=get,list --resource=pods $do
$ k create rolebinding rb --role=reader --serviceaccount=default:app $do
$ k explain pod.spec.securityContext
```

When you forget a field, `k explain --recursive pod.spec | less` is faster than searching the documentation. Learn the layout of the allowed documentation site and use its search for things such as NetworkPolicy and PersistentVolume examples.

## Tasks to be able to do from memory

- Upgrade a cluster with the node-by-node procedure (`kubeadm upgrade`, drain, upgrade kubelet, uncordon)
- Back up and restore etcd with `etcdctl snapshot`
- Create and fix RBAC, NetworkPolicies, PVCs and Ingress
- Troubleshoot a node whose kubelet is stopped: `systemctl status kubelet`, `journalctl -u kubelet`
- Find why a Pod is Pending or crashing using the order from the previous lesson
- For CKS: AppArmor or seccomp profiles, Pod Security Admission, image policy, audit policy, and tools such as Trivy and Falco

## Time plan

Exams commonly contain 15 to 20 tasks in about two hours, each with a weight. A workable approach:

1. Read the whole task list and note the weights. Do quick, high-weight tasks first.
2. Switch to the correct context at the start of **every** task. The task text tells you the command to run.
3. If a task is not progressing after about six to eight minutes, flag it and move on.
4. Verify each answer: run `get`, `describe`, or a test request before moving on.
5. Keep the last ten minutes for flagged tasks.

## Incident: right answer, wrong cluster

> **Incident:** You spend ten minutes solving a task perfectly, then the check fails. The task said to use context `k8s-b`, and you were still on `k8s-a`.

Every task begins with a context command, and skipping it is the most common way to lose points on a task you actually solved. Build the habit: copy the context command from the task, run it, confirm with `k config current-context`, and only then start. This is the same lesson as the first one in this module, except here the cost is marks instead of a production outage.

Practise by timing yourself on a local cluster. Create a deliberately broken setup (a wrong image tag, a missing key, a bad selector), and fix it using only the commands in this module. Do that until the diagnostic order is automatic.

## Common mistakes

- Typing YAML from scratch instead of generating it
- Not setting the context for each task
- Spending 20 minutes on one hard task
- Not verifying the result
- Studying only theory and never practising under a clock

```quiz
Q: What is the fastest way to create a base Deployment manifest in an exam?
- Copy a full manifest from memory
+ kubectl create deployment ... --dry-run=client -o yaml > file
- Write it in a browser editor
- kubectl explain deployment
> Imperative commands with --dry-run=client -o yaml produce valid YAML to edit.

Q: What must you do at the start of every exam task?
- Restart the cluster
+ Switch to the context named in the task and confirm it
- Delete old resources
- Read all the documentation
> Working in the wrong cluster earns no marks even if the solution is right.

Q: A task has stalled for ten minutes with little progress. What is the best move?
- Keep going until it works
+ Flag it, move on, and return if time allows
- Skip verification on the others
- Reset the exam
> Time is shared across all tasks; partial credit elsewhere is worth more than one stuck task.

Q: Which exam requires an active CKA as a prerequisite?
- CKAD
+ CKS
- KCNA
- Neither
> CKS candidates must hold a valid CKA before sitting the exam.
```

```cards
Command to generate YAML without creating the object? :: kubectl ... --dry-run=client -o yaml
First action on every exam task? :: Switch to the stated context and confirm it
What does CKS add to CKA? :: Security topics: hardening, supply chain, runtime security, and policy
Time rule for a stuck task? :: Flag it after about six to eight minutes and return later
```
