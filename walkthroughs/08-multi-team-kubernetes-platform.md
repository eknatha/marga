# A shared Kubernetes platform for many teams
level: Advanced
modules: kubernetes, terraform, security
lessons: kubernetes/rbac-and-security, kubernetes/resources-and-quotas, terraform/environments-and-team-workflows
summary: How a platform team runs shared clusters so that many teams can deploy safely, with isolation, quotas, policy and a repeatable way to create clusters.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Let teams deploy on their own without help for every change
- Stop one team from harming another through resources or access
- Create and upgrade clusters in a repeatable way
- Show who changed what and keep costs visible

## The big picture

```diagram
title: Multi-team Kubernetes platform reference design
node: team | Application teams | 0 | 1 | Own their services and ship through the delivery pipeline. | Teams who bypass the platform create hidden risk.
node: iac | Infrastructure as code | 1 | 0 | Creates clusters, networks and node pools from reviewed code. | Manual changes make clusters drift apart.
node: api | Cluster API server | 1 | 1 | Receives every change, checks identity and policy. | If it is overloaded, nobody can deploy or scale.
node: policy | Policy and admission | 2 | 1 | Rejects unsafe workloads such as privileged pods or missing limits. | Strict policy added late breaks existing apps.
node: ns | Team namespaces | 3 | 1 | Each team gets a space with quotas, roles and network rules. | A namespace without a quota can eat the whole cluster.
node: nodes | Node pools | 3 | 0 | Machines grouped by purpose, such as general, memory-heavy or spot. | One shared pool lets noisy workloads hurt each other.
node: mon | Metrics and cost view | 4 | 1 | Shows usage, errors and cost per team. | Without cost per team nobody feels the bill.
node: idp | Identity provider | 2 | 2 | Single sign-on and group membership for roles. | Stale group membership leaves access after people move teams.
edge: team | api
edge: iac | api
edge: api | policy
edge: policy | ns
edge: ns | nodes
edge: ns | mon
edge: idp | api
```

## Onboarding a new team, step by step

1. The platform team creates a namespace for the team from a template, through code review.
2. The template adds a quota (CPU, memory, number of objects), a default network policy that denies traffic and a role binding for the team group.
3. The team deploys through the pipeline. The API server checks identity, then admission policy rejects pods that run as root or have no resource requests.
4. Pods are scheduled onto a node pool that fits their labels and requests. Requests are what the scheduler uses to place them.
5. Metrics and cost are labelled by namespace, so the team sees its own usage and spend.
6. When the platform upgrades a cluster, nodes drain one pool at a time, and disruption budgets keep each service available.

## Why the design looks like this

- **Namespaces with quotas** give a cheap, strong boundary for fair sharing. They are not a security boundary against a determined attacker, so sensitive workloads may need separate clusters.
- **Admission policy** moves rules from documents into enforcement, so every team gets the same safety checks.
- **Infrastructure as code** makes every cluster the same and makes an upgrade a reviewed change.
- **Group-based roles** from one identity provider make access follow people automatically.
- **Default-deny network rules** mean traffic exists only because someone wrote it down.

## Scaling decisions

1. Begin with one cluster per environment, namespaces per team and quotas from day one.
2. Add policy in audit mode first, then switch to enforce after teams have fixed warnings.
3. Split node pools by workload type when noisy neighbours appear.
4. Add clusters per region or per risk level, not per team, unless a team has special needs.
5. Invest in self-service templates before adding more platform engineers.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| No quota on a namespace | One runaway deployment starves others | Mandatory quotas and limit ranges from the template |
| Cluster upgrade goes wrong | Apps lose capacity during the upgrade | Upgrade a test cluster first, use disruption budgets, upgrade pools one at a time |
| etcd or API overload | Deploys time out, controllers lag | Watch request rates, limit chatty controllers, back up etcd |
| Over-broad role | A team member can read another team's secrets | Least-privilege roles, regular access review |
| Policy blocks a critical fix | An urgent patch cannot be deployed | Documented break-glass path with logging and review |
| Cost surprise | The bill doubles with no owner | Cost labels per team, budgets and alerts |

## Trade-offs

- Shared clusters are cheaper and easier to run, but have a larger blast radius than one cluster per team.
- Strict policy gives safety and consistency. It also slows teams down if exceptions are hard to get.
- A thin platform that offers templates and guidance respects team freedom. A thick platform that hides Kubernetes is easier for newcomers but harder to debug.

```predict
Q: A team deploys an app with no resource requests into a cluster with admission policy in enforce mode. What happens, and what should the error tell them?
???
The API server rejects the deployment. A good message names the rule, says which field is missing and shows an example fix, so the team can correct it in minutes without asking the platform team.
> Policy that explains itself reduces support load.
```
