## Green service, falling conversions
level: junior
A ranking service has normal latency and no errors, but conversions are down.

```text
predict_latency_p95   41 ms
predict_errors        0
feature item_popularity: null rate 100% (training 0.3%)
```
? What is wrong?
+ A feature is arriving empty, so the model is ranking with missing information
- The server is too slow
- The model file is corrupted
- Too many replicas are running
why: Health metrics cannot see input quality. Compare live features with the training reference.

## Same code, different answers
level: mid
Offline tests give 0.87 AUC but production quality is much lower.

```text
training: days_since_login = (today - last_login).days
serving:  days_since_login = hours_since_last_login
```
? What is the likely cause?
+ Training-serving skew: the feature is computed differently in the two places
- The GPU is too small
- The tests ran too fast
- The learning rate is wrong in production
why: Define each feature once and use the same code for training and serving.

## Perfect test score
level: mid
A churn model scores very high in testing and poorly in production.

```text
feature support_tickets_month: includes tickets after cancel_date
label cancel_date: 2026-03-04
audit: leakage risk HIGH
```
? What happened?
+ The training feature used information from after the prediction moment, which leaks the future
- The model is too small
- The test set was too large
- The network is slow
why: Use point-in-time joins so features only use data available when the prediction would be made.

## Cannot rebuild the best model
level: mid
A team needs to retrain the production model and gets a far worse result.

```text
model-prod: code version unknown, data version unknown
train.py: seed not set, requirements.txt unpinned
```
? What should have been recorded?
+ Code and data versions, parameters, seed and environment for every run
- Only the final metric
- The author's name
- The server's IP address
why: A result is only reproducible if the full recipe is recorded.

## Evaluation gate passes a weak model
level: senior
A release passed the gate but support reports poor results for new customers.

```text
overall auc: 0.866 (prod 0.869) PASS
new_customers auc: 0.741 (prod 0.803) not checked
```
? How do you change the gate?
+ Add checks for important groups so a drop in any named group blocks the release
- Raise the overall threshold only
- Remove the gate
- Check on Fridays only
why: Averages can hide group regressions. Gates should look at the groups that matter.

## Rollback takes a day
level: senior
A bad model needs to be rolled back, but the old version cannot be found.

```text
mlreg show churn --stage archived
version 13: artifact MISSING
```
? What should the registry practice be?
+ Keep previous versions and images available so rollback is a stage change
- Delete old versions after release
- Rebuild when needed
- Store models on a laptop
why: A rollback you cannot perform is not a rollback. Keep known good artifacts.

## Bad predictions, no way to replay
level: mid
A team sees one wrong prediction but cannot reproduce it.

```text
request_id 7f3a   logged: output 0.12
logged fields: timestamp, status
missing: model version, input features
```
? What should the service log?
+ The model version, the input features and the output for a sample of requests
- Only the HTTP status
- Only the request time
- Only the server name
why: With the model version, inputs and output you can replay a prediction offline and change one thing at a time to find the cause.
