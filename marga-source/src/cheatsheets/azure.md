---
title: Azure
summary: Identity, networking, compute, storage, cost and diagnostics commands for Azure.
module: cloud
---

## Account and identity

```bash
az login
az account show
az account list --output table
az account set --subscription SUBSCRIPTION_ID
az ad signed-in-user show
az role assignment list --assignee USER_OR_PRINCIPAL_ID --all --output table
```

| Concept | Meaning |
|---------|---------|
| Tenant | Microsoft Entra ID directory |
| Subscription | Billing and isolation boundary |
| Resource group | Container for related resources (required) |
| Azure RBAC | Principal + role + scope |
| Managed identity | Identity for a resource, no secret to manage |

Common roles: Reader, Contributor, Owner, and many specific data roles such as Storage Blob Data Contributor.

```bash
az role assignment create \
  --assignee-object-id PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/SUB_ID/resourceGroups/shop-prod
```

## Resource groups

```bash
az group create --name shop-prod --location westeurope
az group list --output table
az resource list --resource-group shop-prod --output table
az group delete --name shop-dev --yes --no-wait
```

## Networking

```bash
az network vnet list --output table
az network vnet subnet list --resource-group shop-prod --vnet-name shop-vnet --output table
az network nsg list --output table
az network nsg rule list --resource-group shop-prod --nsg-name app-nsg --output table
az network watcher test-ip-flow --direction Inbound --protocol TCP \
  --local 10.20.20.15:5432 --remote 10.20.10.4:50000 \
  --vm VM_NAME --resource-group shop-prod
```

| Component | Role |
|-----------|------|
| VNet and subnets | Private address space |
| NSG | Stateful allow and deny rules on NIC or subnet |
| NAT gateway | Outbound-only internet |
| Private endpoint | Private IP for a PaaS service |
| Network Watcher | Connection troubleshoot, IP flow verify |
| Azure Bastion | Browser-based admin access with no public SSH |

## Compute

```bash
az vm list --show-details --output table
az vm start --name VM_NAME --resource-group shop-prod
az vm deallocate --name VM_NAME --resource-group shop-prod   # stops compute billing
az aks get-credentials --resource-group shop-prod --name shop-aks
az containerapp list --resource-group shop-prod --output table
az functionapp list --output table
```

A stopped VM still bills for compute unless it is deallocated.

## Storage

```bash
az storage account list --output table
az storage container list --account-name acmeuploads --auth-mode login
az storage blob upload --account-name acmeuploads --container-name data \
  --name report.csv --file report.csv --auth-mode login
az storage account update --name acmeuploads --resource-group shop-prod \
  --allow-blob-public-access false
```

| Type | Service |
|------|---------|
| Object | Blob Storage |
| Block | Managed Disks |
| Shared file | Azure Files |

## Secrets and monitoring

```bash
az keyvault secret show --vault-name shop-kv --name db-password --query value -o tsv
az monitor activity-log list --offset 1d --output table
az monitor metrics alert list --resource-group shop-prod --output table
```

## Cost

```bash
az consumption usage list --start-date 2026-10-01 --end-date 2026-10-24 --top 20 --output table
az consumption budget list --output table
```

Set budgets with alerts, tag resources with `owner`, `env` and `service`, and deallocate or delete idle resources.

## Policy and governance

```bash
az policy assignment list --output table
az policy state list --resource-group shop-prod --filter "complianceState eq 'NonCompliant'"
az lock create --name no-delete --lock-type CanNotDelete --resource-group shop-prod
```

Azure Policy enforces rules such as allowed regions and required tags. Resource locks guard against accidental deletion.

## Subscription and identity checks

```bash
az account show -o table
az account list -o table
az account set --subscription "Production"
az ad signed-in-user show --query userPrincipalName
az role assignment list --assignee user@example.com --all -o table
az group list -o table
az resource list -g rg-shop -o table
az monitor activity-log list --offset 1d --query "[?level=='Error']" -o table
```

> **Warning:** Check `az account show` before every change. The default subscription can be production. Use `--subscription` in scripts instead of relying on the current one.

## Compute and network, more

```bash
az vm list -d -g rg-shop -o table
az vm deallocate -g rg-shop -n vm-web1
az vm run-command invoke -g rg-shop -n vm-web1 --command-id RunShellScript --scripts "systemctl status nginx"
az network nsg rule list -g rg-shop --nsg-name nsg-web -o table
az network public-ip list -o table
az network vnet subnet list -g rg-shop --vnet-name vnet-shop -o table
az aks get-credentials -g rg-shop -n aks-shop --overwrite-existing
az aks show -g rg-shop -n aks-shop --query "{version:kubernetesVersion,state:provisioningState}"
az storage account show -n acmeshop --query "{https:enableHttpsTrafficOnly,public:allowBlobPublicAccess}"
```

> **Warning:** `az vm stop` keeps the VM allocated and you still pay for it. Use `az vm deallocate` to stop compute billing.

> **Warning:** `az vm run-command` runs as root or SYSTEM. Treat the script as a production change and log it.

> **Warning:** `az aks get-credentials --overwrite-existing` replaces the kube context of the same name. Check `kubectl config current-context` afterwards.

## Delete and cost cautions

```bash
az group show -n rg-test --query "properties.provisioningState"
az resource list -g rg-test -o table
az group delete -n rg-test --no-wait
az lock create --name keep --lock-type CanNotDelete -g rg-shop
az consumption usage list --top 20 -o table
```

> **Danger:** `az group delete` removes every resource in the group, including databases and storage. List the resources first, and apply `CanNotDelete` locks to production groups.

> **Warning:** `--yes` and `--no-wait` hide prompts and results. Do not add them to commands you have not run before.

> **Warning:** Do not put client secrets in scripts. Use managed identities, and rotate service principal secrets before they expire.
