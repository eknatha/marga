## No valid host
level: mid
A server create ends in ERROR.

```text
$ openstack server show app-9 -c status -c fault -f value
ERROR
{'code': 500, 'message': 'No valid host was found. There are not enough hosts available.'}
$ openstack compute service list --service nova-compute -c Host -c State
cmp-1 up
cmp-2 down
```
? What is a sensible first reading?
+ No compute node passed all the scheduler checks, so check service state and per-node free resources
- The password is wrong
- The image is missing
- The project has no users
why: The message does not say which check failed. Service state, free resources per node and aggregates are the usual causes.

## Quota exceeded
level: junior
A create fails with a 403.

```text
$ openstack server create --flavor m1.xlarge --image ubuntu app-9
Quota exceeded for cores: Requested 8, but already used 16 of 20 cores (HTTP 403)
```
? What does this mean?
+ The project reached its core limit, which is a rule rather than a fault
- Nova is broken
- Keystone has expired
- The network is down
why: Quotas limit each project. Delete unused servers, use a smaller flavor or ask an admin to raise the limit.

## Stuck in detaching
level: senior
A volume has been detaching for an hour.

```text
$ openstack volume show data-vol -c status
| status | detaching |
$ openstack compute service list --service nova-compute | grep cmp-7
| cmp-7 | down |
```
? What do you do first?
+ Check why the compute node is down and compare the hypervisor with the database before resetting any state
- Set the volume to available straight away
- Delete the volume
- Restart Keystone
why: The node that would complete the detach is down. A blind state reset can leave the guest and the record disagreeing and risk data.

## Everything fails together
level: senior
Nova, Neutron and Cinder all report errors in the same minute.

```text
$ openstack compute service list | grep -c down
12
$ sudo rabbitmqctl cluster_status | head -2
Error: unable to perform an operation on node 'rabbit@ctl-1'
```
? What is the likely cause?
+ A shared dependency, here the message queue, has failed
- Each service has an independent bug
- A user typed a wrong password
- The dashboard theme changed
why: When unrelated services fail together, check the database and message queue first.

## 401 from a pipeline
level: mid
A deployment script that worked yesterday now fails.

```text
$ openstack token issue
The request you have made requires authentication. (HTTP 401)
$ openstack user show ci-deployer -c password_expires_at
| password_expires_at | 2026-11-03T00:00:00 |
```
? What is the likely cause?
+ The service account password expired; use an application credential for automation
- The flavor was deleted
- The router is down
- The image is too big
why: A password policy can expire service accounts. Application credentials separate automation from people.

