---
title: Bicep modules, loops and conditions
minutes: 12
summary: Split Bicep into modules, repeat resources with for loops, switch them with conditions and share modules through a registry.
---

As a Bicep estate grows, copy and paste becomes the enemy. Modules give structure, loops remove repetition, and conditions keep one file useful for many environments.

## What you will learn

- Modules and their inputs and outputs
- Loops over arrays and objects
- Conditions and existing resources
- Sharing modules via a registry

## Modules

```bicep
module net './modules/network.bicep' = {
  name: 'network'
  params: {
    vnetName: 'vnet-${env}'
    subnets: ['web', 'app', 'data']
  }
}

output vnetId string = net.outputs.vnetId
```

Each module is a Bicep file with `param` and `output`. The module runs as its own nested deployment, which appears under that name in the portal and in deployment history.

## Loops and conditions

```bicep
resource subnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = [for (name, i) in subnets: {
  parent: vnet
  name: name
  properties: { addressPrefix: '10.0.${i}.0/24' }
}]

resource lock 'Microsoft.Authorization/locks@2020-05-01' = if (env == 'prod') {
  name: 'no-delete'
  properties: { level: 'CanNotDelete' }
}
```

Use `existing` to refer to a resource created elsewhere: `resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = { name: kvName }`.

## Registry

Publish tested modules to an **Azure Container Registry** with `az bicep publish`, and use them as `module m 'br:acme.azurecr.io/bicep/network:v1.2' = { ... }`. Public ready-made modules are available under the `br/public` alias. Version modules and pin versions.

```diagram
title: Modules and loops
node: main | main.bicep | 0 | 1 | Orchestrates modules with parameters. | Large mains become unreadable; keep it thin.
node: net | Network module | 1 | 0 | Creates a vnet and subnets by looping. | Changing a loop key can recreate subnets.
node: app | App module | 1 | 1 | Uses outputs from the network module. | Missing outputs break the dependency.
node: reg | Module registry | 1 | 2 | Stores versioned shared modules in ACR. | Unpinned versions change under you. | store
node: rg | Resource group | 2 | 1 | Result of all nested deployments. | Failures appear in the nested deployment name.
edge: main | net
edge: main | app
edge: reg | main
edge: net | rg
edge: app | rg
```

## Incident: Six copies of one vnet

> **Incident:** A subnet change had to be repeated in six files and one was missed.

```console
$ az network vnet subnet list --vnet-name vnet-eu -g rg-eu -o table
web  app
$ az network vnet subnet list --vnet-name vnet-us -g rg-us -o table
web  app  data
```

Copies drifted apart. The team created one network module with a subnet list, published it to a registry with a version, and every environment now uses it.

## Common mistakes

- Copy and paste instead of modules
- Unpinned registry module versions
- Changing loop items so resources are recreated
- Modules with dozens of parameters

```quiz
Q: How does a Bicep module return values?
+ Through output
- Through variables only :: No.
- By file name :: No.
- Through tags :: No.
> Modules expose outputs.

Q: What does a Bicep if condition do?
+ Creates the resource only when true
- Deletes resources :: No.
- Renames resources :: No.
- Skips parameters :: No.
> Conditional deployment.

Q: What is the existing keyword for?
+ Referring to a resource created elsewhere
- Creating twice :: No.
- Deleting resources :: No.
- Hiding output :: No.
> It declares a reference.

Q: Why pin module versions?
+ Shared modules change over time
- Faster builds :: No.
- Smaller files :: No.
- Cheaper billing :: No.
> Pins keep deployments repeatable.
```

```cards
Module :: A Bicep file used by another Bicep file
Loop :: Repeating a resource for each item in a list
Existing :: A reference to a resource not created by this file
Registry :: A store for versioned Bicep modules
Nested deployment :: A deployment created by a module
```
