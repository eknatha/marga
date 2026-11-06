---
title: Bicep deployments, what-if and scopes
minutes: 13
summary: Choose deployment scopes, preview changes with what-if, understand incremental and complete modes and keep deployment history manageable.
---

Where a deployment lands and how it changes existing resources matter as much as the template. Scope, mode and a preview step are the three controls.

## What you will learn

- Scopes from resource group to tenant
- Incremental and complete modes
- What-if previews
- Deployment history and protection

## Scopes

```bicep
targetScope = 'subscription'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-app-${env}'
  location: 'westeurope'
}

module app './app.bicep' = {
  scope: rg
  name: 'app'
}
```

A file targets a **resource group** (default), **subscription** (create groups, policies, role assignments), **management group** or **tenant**. Modules can switch scope as shown. Use the matching command: `az deployment group create` or `az deployment sub create`.

## Modes

| Mode | Behaviour |
|---|---|
| Incremental (default) | Adds and updates resources in the file; leaves others alone |
| Complete | Also deletes resources in the group that are not in the file |

## What-if

```console
$ az deployment group what-if -g rg-app-dev --template-file main.bicep --parameters env=dev
  + Create   Microsoft.Network/publicIPAddresses/pip-app
  ~ Modify   Microsoft.Storage/storageAccounts/stapp
      ~ sku.name: "Standard_LRS" => "Standard_GRS"
  - Delete   Microsoft.Compute/virtualMachines/vm-old
```

Read the symbols: `+` create, `~` modify, `-` delete, `=` no change. Put what-if in pull request checks and require approval of the output for production.

## History and protection

Azure keeps up to 800 deployments per group and can delete the oldest automatically. Add **resource locks** (CanNotDelete) and **Azure Policy** to block risky changes regardless of the template.

```diagram
title: A safe Azure deployment
node: pr | Pull request | 0 | 0 | Bicep change reviewed by a person. | A skipped review sends untested code on.
node: wi | what-if | 1 | 0 | Lists creates, changes and deletes. | Ignoring deletes is the classic mistake. | observe
node: appr | Approval | 2 | 0 | Someone confirms the preview for production. | Rubber stamping defeats the check. | security
node: dep | Deployment | 3 | 0 | Applies in incremental mode. | Complete mode can delete unlisted resources.
node: lock | Locks and Policy | 3 | 1 | Block deletes and unsafe settings regardless of code. | Missing locks leave critical resources open to deletion. | security
edge: pr | wi
edge: wi | appr
edge: appr | dep
edge: lock | dep
```

## Incident: Complete mode deleted the lot

> **Incident:** A partial template ran in complete mode and removed every resource not in it.

```console
$ az deployment group create -g rg-app --template-file part.bicep --mode Complete
Deleted: Microsoft.Compute/virtualMachines/vm-db
Deleted: Microsoft.Storage/storageAccounts/stdata
```

A what-if would have shown the deletes. The team restored from backup, set CanNotDelete locks on data resources and made what-if output a required step in the pipeline.

## Common mistakes

- Complete mode with a template that is not the full truth
- Skipping what-if on production
- No resource locks on data stores
- Letting deployment history hit its limit

```quiz
Q: What does what-if show?
+ Planned creates, modifies and deletes
- Costs only :: No.
- Logs :: No.
- Users :: No.
> It previews the deployment.

Q: Which mode deletes unlisted resources?
+ Complete
- Incremental :: No.
- Preview :: No.
- Test :: No.
> Complete mode removes extras.

Q: Which scope creates resource groups?
+ Subscription
- Resource group :: No.
- Extension :: No.
- Tag :: No.
> Groups live in a subscription.

Q: What do CanNotDelete locks do?
+ Block deleting a resource
- Block reading :: No.
- Block all changes :: No.
- Rename resources :: No.
> Protects against accidental deletes.
```

```cards
Scope :: The level a deployment targets
Complete mode :: Deployment that deletes resources not in the template
What-if :: A preview of deployment changes
Lock :: A control that blocks deleting or changing a resource
Azure Policy :: Rules that allow or deny resource settings
```
