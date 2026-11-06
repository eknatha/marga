---
title: Schemas, contracts and evolving messages
minutes: 13
summary: Define message formats with Avro, Protobuf or JSON Schema, use a schema registry, and change formats without breaking producers or consumers.
---

Messages outlive code. A topic can hold a week or a year of records, and consumers written by other teams read them at different times. A schema and compatibility rules turn a hopeful agreement into something a build can enforce.

## What you will learn

- Why a schema beats unstructured JSON
- Backward, forward and full compatibility
- Safe and unsafe changes
- Registry, subjects and CI checks

## Schema formats

**JSON Schema** describes JSON, easy to read, larger on the wire. **Avro** stores data in compact binary and the schema travels by id; it supports defaults and evolution. **Protobuf** uses numbered fields, so names can change but numbers must not.

```json
{
  "type": "record", "name": "OrderPaid", "namespace": "shop",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "currency", "type": "string", "default": "EUR"}
  ]
}
```

## Compatibility

| Mode | Meaning | Upgrade order |
|---|---|---|
| Backward | New schema can read old data | Consumers first |
| Forward | Old schema can read new data | Producers first |
| Full | Both | Any order |

## Safe changes

- Add a field **with a default** (safe for backward compatibility).
- Remove an **optional** field.
- Never change a field's type, reuse a field name or Protobuf field number, or make an optional field required.
- For a breaking change, **expand then contract**: add the new field, write both, move all consumers, then remove the old one later.

## Registry

A **schema registry** stores versions under a **subject** (usually topic name plus key or value). Producers register or look up a schema and send only its id. The registry rejects a new version that breaks the chosen compatibility mode. Run the compatibility check in CI so an incompatible change fails the pull request.

```diagram
title: How a schema change is checked
node: dev | Developer changes schema | 0 | 0 | Adds a field or changes a type in the schema file. | A rename looks harmless but breaks readers.
node: ci | CI compatibility check | 1 | 0 | Asks the registry whether the new version is compatible. | Skipping CI lets a breaking change reach production. | observe
node: reg | Schema registry | 2 | 0 | Stores versions per subject and enforces the mode. | If it is down, producers may be unable to send. | store
node: prod | Producer | 3 | 0 | Writes records with the schema id. | An old producer keeps writing the old format for a while.
node: cons | Consumers | 3 | 1 | Look up the schema by id to decode records. | A consumer on an incompatible schema fails on old records.
edge: dev | ci
edge: ci | reg
edge: reg | prod
edge: prod | cons
```

## Incident: Revenue of zero

> **Incident:** A producer renamed a field and consumers read nulls for a day.

```console
$ psql -c "select sum(amount) from daily_revenue where day = current_date - 1"
0.00
producer: schema v7 renamed amount to total
consumer: schema v6 expects amount, got null
```

The rename was not a compatible change. The team reverted, replayed the day from the topic, and enabled a full-compatibility check in CI. Renames now happen by adding the new field and removing the old one later.

## Common mistakes

- Renaming or retyping a field in place
- Required fields with no default
- Reusing a Protobuf field number
- No compatibility check in the build

```quiz
Q: Which change is safe for backward compatibility?
+ Adding a field with a default
- Renaming a field :: No.
- Changing its type :: No.
- Making an optional field required :: No.
> Defaults let new readers read old data.

Q: What does a schema registry do?
+ Stores schema versions and enforces compatibility
- Encrypts topics :: No.
- Balances load :: No.
- Creates partitions :: No.
> It acts as a contract store.

Q: What is expand then contract?
+ Add the new form, migrate readers, then remove the old
- Delete first :: No.
- Rename in place :: No.
- Duplicate topics :: No.
> It makes breaking changes gradual.

Q: What do Protobuf field numbers require?
+ They must never be reused or changed
- They may change freely :: No.
- They encode time :: No.
- They are secret :: No.
> Numbers identify fields on the wire.
```

```cards
Schema :: A definition of fields and types in a message
Compatibility mode :: Rules a new schema version must follow
Subject :: The name under which a registry stores schema versions
Avro :: A compact binary format with schemas and defaults
Expand and contract :: Changing formats in two safe phases
```
