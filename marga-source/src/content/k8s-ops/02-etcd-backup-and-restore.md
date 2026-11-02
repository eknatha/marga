---
title: etcd backup and restore
minutes: 13
summary: Take a verified snapshot of cluster state, restore it, and know the limits of what a backup protects.
---

If you lose etcd and have no backup, you lose the definition of your cluster. A backup you have never restored is only a hope. This lesson covers taking snapshots, storing them safely, restoring into a new cluster, and testing the whole procedure on a schedule.

## What you will learn

- Take an etcd snapshot
- Store and protect backups
- Restore from a snapshot
- Test restores and know what a backup does not cover

## Taking a snapshot

Use `etcdctl` with the endpoints and client certificates of your cluster:

```bash
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%F).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
etcdutl snapshot status /backup/etcd-2024-05-14.db -w table
```

The status command shows the revision, key count and size, which proves the file is readable. Managed Kubernetes services hide etcd; use the provider's backup features or a tool that backs up objects and volumes.

## Store it well

Copy snapshots off the node at once, to storage in another location, encrypted and with limited access, because etcd holds Secrets. Keep several generations and a retention policy. Schedule snapshots often enough for your recovery point: hourly is common. Alert if the newest snapshot is older than expected.

## Restoring

Restoring creates a new data directory from the snapshot with `etcdutl snapshot restore`, then the etcd static pod or service is pointed at it. On a multi-member cluster, restore every member from the same snapshot with the new cluster flags and start them together. Stop the API servers during the restore so they do not write. After starting, check member health and that objects are present.

## Limits of a backup

An etcd snapshot restores Kubernetes objects. It does not contain the data in persistent volumes, container images, certificates stored outside the data directory unless you save them, or the state of external systems. It also restores old state: objects deleted since then reappear, and nodes may disagree with reality. Pair etcd backups with volume snapshots, a copy of the PKI directory, and manifests kept in a repository.

```predict
Q: You restore a three-day-old snapshot. What might surprise you?
???
Objects created or changed in the last three days are gone, and objects deleted since then are back.
> State rolls back to the snapshot time.
```

## Incident: The backup that could not restore

> **Incident:** A cluster lost two of three etcd members and the team tried to restore the latest nightly snapshot.

```console
$ etcdutl snapshot status /backup/etcd-latest.db -w table
Error: file is corrupt or truncated
$ ls -l /backup | tail -3
-rw-r--r-- 1 root root 0 May 13 02:00 etcd-2024-05-13.db
```

The copy job had been failing for a month and writing empty files. The team restored from an older valid file, then added a check that verifies each snapshot with the status command, alerts on size and age, and runs a quarterly restore drill in a test cluster.

## Common mistakes

- Never testing a restore
- Leaving snapshots on the same node
- Forgetting that etcd holds Secrets
- Assuming etcd backup covers volumes

```quiz
Q: What command checks a snapshot is readable?
+ etcdutl snapshot status
- ls :: Shows size only.
- ping :: No.
- kubectl get pods :: Needs a working cluster.
> Verify every file. Re-read the matching lesson section for the full reasoning.

Q: Where should snapshots be stored?
+ Off the node, encrypted, access-controlled
- On the same disk :: Lost together.
- In chat :: No.
- In a public bucket :: Contains Secrets.
> Protect and separate. Re-read the matching lesson section for the full reasoning.

Q: Does an etcd snapshot include persistent volume data?
+ No
- Yes :: False.
- Only on Tuesdays :: False.
- Only for databases :: False.
> Back up volumes separately. Re-read the matching lesson section for the full reasoning.

Q: What should API servers do during a restore?
+ Be stopped so they do not write
- Run normally :: Conflicts.
- Restart in a loop :: Bad.
- Be deleted :: Unnecessary.
> Quiet the cluster. Re-read the matching lesson section for the full reasoning.
```

```cards
snapshot save :: take a backup
snapshot status :: verify it
snapshot restore :: new data directory
Off-node copy :: survive node loss
Secrets :: protect backups
Drill :: restore on a schedule
```
