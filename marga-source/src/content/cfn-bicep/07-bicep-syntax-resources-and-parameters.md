---
title: Bicep syntax, resources and parameters
minutes: 13
summary: Write Bicep files with parameters, variables, resources, outputs and decorators, and deploy them to a resource group.
---

Bicep removes the noise of ARM JSON. A file has parameters in, resources in the middle and outputs out, and the compiler handles the order of creation.

## What you will learn

- The parts of a Bicep file
- Decorators, types and secure values
- Dependencies and references
- Deploying and converting

## A small file

```bicep
@description('Short environment name')
@allowed(['dev', 'prod'])
param env string = 'dev'

@secure()
param adminPassword string

var storageName = 'st${uniqueString(resourceGroup().id)}${env}'

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: resourceGroup().location
  sku: { name: env == 'prod' ? 'Standard_GRS' : 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2' }
}

output blobEndpoint string = sa.properties.primaryEndpoints.blob
```

- `param` is an input; `@allowed`, `@secure`, `@minLength` constrain it.
- `var` is a computed value.
- `resource` has a symbolic name, a type with an API version, and properties. Referring to `sa.properties...` creates an **implicit dependency**, so Azure orders the work.
- `uniqueString()` builds a stable, unique suffix for global names.

## Deploy

```console
$ az group create --name rg-app-dev --location westeurope
$ az deployment group create --resource-group rg-app-dev --template-file main.bicep \
    --parameters env=dev adminPassword=$PW
$ az bicep build --file main.bicep       # compile to ARM JSON
$ az bicep decompile --file old.json     # convert ARM to Bicep
```

Use `.bicepparam` files to keep environment values out of the template.

```diagram
title: Bicep to Azure
node: file | main.bicep | 0 | 0 | Parameters, variables, resources and outputs. | Old API versions miss new features.
node: comp | Bicep compiler | 1 | 0 | Checks types and produces an ARM template. | Errors appear before any deployment. | observe
node: arm | Azure Resource Manager | 2 | 0 | Orders and creates the resources. | Failed resources leave a partial deployment. | process
node: rg | Resource group | 3 | 0 | Holds the created resources. | Deleting it removes everything inside. | store
node: params | Parameter file | 1 | 1 | Values for each environment. | Secrets in plain files leak. | security
edge: file | comp
edge: comp | arm
edge: arm | rg
edge: params | arm
```

## Incident: The name that was not unique

> **Incident:** A storage account deploy failed because the name was already taken.

```console
$ az deployment group create --resource-group rg-app-dev --template-file main.bicep
(StorageAccountAlreadyTaken) The storage account named acmestorage is already taken.
```

Storage account names are global. Building the name with uniqueString() made it stable inside the resource group and unique across Azure.

## Common mistakes

- Fixed names for globally unique resources
- Secrets as plain parameters instead of @secure or Key Vault references
- Very old API versions
- Editing generated ARM JSON instead of the Bicep file

```quiz
Q: What does @secure() do?
+ Hides a parameter value from logs and output
- Adds encryption at rest :: No.
- Makes a resource private :: No.
- Opens a firewall :: No.
> Protects values in deployment history.

Q: How does Bicep order resources?
+ By references between them
- By file position :: No.
- Alphabetically :: No.
- Randomly :: No.
> References create dependencies.

Q: What does uniqueString help with?
+ Globally unique names
- Colours :: No.
- Passwords :: No.
- Tags :: No.
> A stable hash value.

Q: Which command compiles Bicep?
+ az bicep build
- az group list :: No.
- az login :: No.
- az vm start :: No.
> It outputs ARM JSON.
```

```cards
Param :: An input to a Bicep file
Symbolic name :: The name used to refer to a resource inside the file
API version :: The version of a resource type definition
Decorator :: An annotation that constrains or describes a parameter
bicepparam :: A file of parameter values for a Bicep deployment
```
