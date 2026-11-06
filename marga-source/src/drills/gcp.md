## PERMISSION_DENIED on a bucket
level: junior
A developer cannot read a file.

```text
ERROR: (gcloud.storage.cat) 403 dev@acme.example does not have storage.objects.get access
```
? What is the right fix?
+ Grant a narrow role such as Storage Object Viewer on that bucket after checking with Policy Troubleshooter
- Grant Owner on the project
- Share one admin account
- Make the bucket public
why: The error names the missing permission. Grant the smallest role at the lowest level.

## API has not been used
level: junior
A command fails in a new project.

```text
ERROR: Compute Engine API has not been used in project acme-pay-dev before or it is disabled.
```
? What do you do?
+ Enable the API with gcloud services enable compute.googleapis.com in that project
- Delete the project
- Switch to another region
- Grant Owner
why: APIs are off by default and enabled per project.

## Backends unhealthy behind a load balancer
level: mid
Backends show UNHEALTHY after a firewall change.

```text
$ gcloud compute backend-services get-health web --global
healthState: UNHEALTHY
```
? What is the likely cause?
+ The firewall blocks health check ranges 130.211.0.0/22 and 35.191.0.0/16 to the service port
- The disk is full
- The bucket is private
- The project is too old
why: Google health checks come from fixed ranges. Allow them to the backend port.

## Pods stay Pending
level: mid
New pods do not schedule.

```text
0/3 nodes are available: 3 Insufficient cpu.
cluster-autoscaler: node pool at maximum size 3
```
? What should you do?
+ Raise the node pool maximum or right-size requests, and check project quota
- Delete the pods
- Disable the autoscaler
- Restart the control plane
why: The pool cannot add nodes at its limit. Capacity or requests must change.

## Surprise BigQuery bill
level: senior
A single query is expensive.

```text
Total bytes processed: 48.2 TB   table: logs.events (not partitioned)
```
? What reduces the cost?
+ Partition by date, require a partition filter, select only needed columns and dry-run first
- Run the query more often
- Use select star
- Add more projects
why: On-demand pricing is per bytes scanned. Partitioning and column selection cut the scan.

## Cloud Run floods the database
level: senior
A surge opens too many database connections.

```text
FATAL: remaining connection slots are reserved
Cloud Run max instances: not set
```
? What is the fix?
+ Set max instances, lower per-instance connections and use a pooler
- Remove the database limit
- Set concurrency to 1000
- Add public IPs
why: Unlimited scaling meets a limited database. Cap the scale and pool connections.
