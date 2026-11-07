---
title: Feature stores and data versioning
minutes: 12
summary: Keep training and serving features consistent with a feature store, and version datasets so any model can be reproduced.
---

Most ML bugs are data bugs. If a feature means one thing in the training notebook and another in the serving code, the model learns something the service cannot reproduce. Shared definitions and versioned data remove that gap.

## What you will learn

- Training and serving skew and why it happens
- What a feature store provides
- Point-in-time correctness and leakage
- Versioning datasets and lineage

## Skew

Training reads history from a warehouse with batch code. Serving computes the same value from live data with different code. Small differences, such as null handling, time zones or rounding, cause a model to behave worse than any offline test suggested.

## One definition

```python
# a feature defined once, used for offline and online
from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int64

customer = Entity(name="customer_id", join_keys=["customer_id"])
orders_stats = FeatureView(
    name="orders_stats",
    entities=[customer],
    ttl=timedelta(days=2),
    schema=[Field(name="orders_7d", dtype=Int64), Field(name="avg_basket", dtype=Float32)],
    source=FileSource(path="data/orders_stats.parquet", timestamp_field="event_ts"),
)
```

The **offline store** holds history for training, and the **online store** serves the latest values with low latency. A materialization job keeps them in sync.

## Point in time

When building training rows, use only data that was available **at the time of each label**. Using a later value leaks the future into the model and inflates results. Feature stores provide point-in-time joins for this.

## Version everything

Record the dataset version, feature definitions, code commit and parameters with every trained model. Tools such as DVC, lakehouse table versions or MLflow datasets let you reload exactly what a model saw.

```bash
dvc add data/train.parquet
git add data/train.parquet.dvc && git commit -m "train data v12"
mlflow runs describe --run-id "$RUN_ID"
```

Monitor **freshness** of online features. Stale features silently degrade predictions.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Feature stores and data versioning fits together
node: n1 | Skew | 0 | 0 | Training reads history from a warehouse with batch code. | Separate code for training and serving features. | process
node: n2 | One definition | 1 | 1 | The offline store holds history for training, and the online store serves the latest values with low latency. | Using future data in training rows. | process
node: n3 | Point in time | 2 | 0 | When building training rows, use only data that was available at the time of each label. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n4 | Version everything | 3 | 1 | Record the dataset version, feature definitions, code commit and parameters with every trained model. | Ignoring stale online features. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Perfect offline, poor online

> **Incident:** A model's accuracy dropped after launch because of a feature mismatch.

```console
offline AUC: 0.91
online AUC first week: 0.74
feature avg_basket differs from offline value in 38% of requests
```

The service computed an average with a different window than the training job. Comparing logged online features with the offline values revealed it. The team moved both to one feature definition and added a daily skew check.

## Common mistakes

- Separate code for training and serving features
- Using future data in training rows
- Unversioned datasets
- Ignoring stale online features

```quiz
Q: What is training-serving skew?
+ Features differ between training and serving
- A slow GPU :: No.
- A full disk :: No.
- A bad image :: No.
> Models see different inputs.

Q: What is point-in-time correctness?
+ Using only data available at label time
- Using all data :: No.
- Random sampling :: No.
- Faster joins :: No.
> Avoids leakage. The lesson section above explains why.

Q: What does the online store provide?
+ Low-latency latest feature values
- Large history :: No.
- Backups :: No.
- Logs :: No.
> It serves predictions.

Q: Why version datasets?
+ To reproduce any model
- To save disk :: No.
- To avoid code :: No.
- To hide data :: No.
> Reproducibility. The lesson section above explains why.
```

```cards
Feature store :: System that defines and serves features
Training-serving skew :: Mismatch between training and serving inputs
Leakage :: Using information not available at prediction time
Lineage :: Trace from raw data to a model
```
