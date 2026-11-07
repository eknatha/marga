## Sealed after reboot
level: junior
After a patch reboot nobody can reach Vault.

```text
$ vault status
Sealed true
Unseal Progress 1/3
```
? What does this mean?
+ Vault needs more key shares or an auto-unseal source to unseal
- The token expired
- The audit device is full
- The policy is wrong
why: Vault starts sealed. Use enough Shamir shares or configure auto-unseal.

## Role accepts any pod
level: mid
A test pod could read production secrets.

```text
$ vault read auth/kubernetes/role/app
bound_service_account_names [*]
bound_service_account_namespaces [*]
```
? What is wrong?
+ The role binding uses wildcards, so any service account can log in
- The TTL is too short
- KV is version 1
- Transit is disabled
why: Bind roles to the exact service account and namespace.

## Policy that gives nothing
level: junior
A policy allows read on secret/billing/*, yet reads are denied.

```text
$ vault kv get secret/billing/db
Error: permission denied
```
? What is the likely mistake?
+ The policy path lacks the KV v2 data/ prefix
- The token is too long
- The secret is too small
- Audit is off
why: KV v2 reads secret/data/billing/db underneath. Include data/ in the policy.

## Audit disk full
level: senior
Vault answers 500 on all requests.

```text
$ journalctl -u vault | tail -n 1
audit: no audit devices are available to write to
```
? What happened?
+ The only audit device cannot write, so Vault refuses requests
- Vault is sealed
- The root key was rotated
- The policy is missing
why: Enable two audit devices and alert on disk space.

## Credential still works
level: mid
A leaked dynamic database user still logs in two days later.

```text
$ vault read database/creds/orders-ro
lease_duration 1h
max_ttl 0
```
? What should you check?
+ Whether the role has a max_ttl and whether leases are being renewed forever
- Whether the audit log is HMACed
- Whether KV is enabled
- Whether the cluster is on Raft
why: A missing max_ttl lets renewals continue. Set default_ttl and max_ttl.

## Leaked token
level: senior
A token appears in a public repository.

```text
$ vault token lookup -accessor "$ACCESSOR"
policies [ci-read]
ttl 718h
```
? What is the first action?
+ Revoke the token by accessor and revoke its leases
- Seal Vault immediately
- Rotate the audit device
- Delete all policies
why: Contain first, then read the audit log and rotate any static secrets that were readable.
