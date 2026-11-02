## Why can a model fail while the service looks healthy?
level: junior
The service only reports on speed and errors. A model can return answers quickly while its inputs have changed or the world has moved on, so predictions get worse with no error. That is why I monitor input features, prediction distributions and, when labels arrive, real quality, as well as latency and errors.

## What is training-serving skew and how do you prevent it?
level: mid
Skew is when the model sees different inputs in production than it saw in training, often because a feature was computed in two places with different code. I prevent it by defining each feature once and using the same code or a feature store for both, and by checking live feature distributions against the training reference.

## What is data leakage?
level: mid
Leakage is when training uses information that would not exist at prediction time, such as an outcome recorded after the event. The model looks excellent in testing and fails in production. I prevent it with point-in-time joins and by reviewing features against the moment of prediction.

## What do you record to make a model run reproducible?
level: junior
The code version, the data version, the parameters, the random seed, the environment with library versions and hardware, and the resulting metrics and artifacts. I log them automatically to a tracking system and run training in a pinned container so any model can be rebuilt.

## How would you release a new model safely?
level: senior
I register it with lineage, package it in a pinned image recorded by digest, run it in shadow mode on real traffic, then send a small canary with checks on errors, latency and quality. I promote in steps, keep the previous version loaded, and make rollback a single stage change that I have practised.

## What is the difference between data drift and concept drift, and how do you detect each?
level: senior
Data drift is a change in input distributions and can be measured against a training reference. Concept drift is a change in the relationship between inputs and outcomes and needs labels or a trusted proxy. I alert on sustained input and prediction drift as early signals, compare quality with a simple baseline when labels land, and retrain through the same gated pipeline.
