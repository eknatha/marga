## What is Ceph and what services does it provide?
level: junior
Ceph is a distributed, software-defined storage system built on RADOS, an object store. On top it offers RBD block devices, CephFS shared file systems and RGW S3 and Swift object storage. It runs on commodity servers, keeps several copies or erasure coded chunks of data, and heals itself when disks or hosts fail.

## What do monitors do, and why run three or five?
level: junior
Monitors hold the cluster map and agree on it by majority vote. An odd number gives a clear majority: three tolerate one failure and five tolerate two. Two monitors tolerate nothing. Without quorum clients cannot find data, so spread monitors across failure domains.

## How does Ceph decide where to place data?
level: mid
An object is hashed to a placement group in its pool, and the CRUSH algorithm maps that placement group to OSDs while respecting a failure domain such as host or rack. Because clients compute placement from the cluster map, there is no central lookup table to become a bottleneck.

## What do size and min_size mean for a replicated pool?
level: mid
Size is the number of copies. Min_size is how many copies must be available for the placement group to accept IO. With size 3 and min_size 2 the pool keeps working with one copy missing and pauses at two missing, which avoids writing data that exists only once.

## When would you choose erasure coding over replication?
level: senior
For large, write-once or cold data such as object storage and backups, where saving raw space matters. EC 4+2 uses 1.5 times the space instead of 3 times and survives two failures, but it needs enough hosts for k+m chunks, costs more CPU, recovers more heavily, and handles small random writes poorly. Replication suits databases, VM disks and CephFS metadata.

## The cluster shows nearfull warnings. What do you do?
level: senior
Treat it as urgent. Check ceph osd df for uneven usage and let the balancer fix skew, delete or expire data, and add capacity before the backfillfull and full thresholds block recovery and writes. Plan to stay near 70 percent so a lost host can be rebuilt, and alert earlier at 65 percent.
