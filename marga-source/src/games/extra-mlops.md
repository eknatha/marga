## The model that quietly got worse
module: mlops
level: Advanced
minutes: 7
lesson: mlops/monitoring-drift-and-retraining
summary: Conversions fall for weeks while latency and errors stay green. Find out why and fix the loop.
intro: A ranking model has been live for months. Dashboards are green, but the business team says conversions have slipped by a tenth over six weeks.

### s1
text: Latency and errors are normal, yet results are worse. What do you check first?
- Input features and prediction distributions against the training reference => s2 | 2 | Quality problems usually start in the data. Example: A feature that is now 40 percent null shows up in a null-rate comparison within minutes.
- Add more servers => s2 | 0 | Capacity is not the issue. Example: More replicas return the same poor ranking faster.
- Restart the model service => s2 | 1 | It may help if state is stale, but it rarely fixes drift. Example: The service restarts and the same inputs give the same ranking.

### s2
text: One feature has been empty since an upstream rename. What is the best immediate action?
- Fix or map the field upstream, backfill if needed, and roll back to the last model that did not depend on it if quality is hurting users => s3 | 2 | Stop the harm, then repair the data. Example: The old model version is promoted again while the feature pipeline is corrected.
- Retrain on the broken data right away => end-fail | 0 | You would teach the model that the feature is empty. Example: A retrain on null values produces a model that ignores a useful signal.
- Wait for the next scheduled retrain => s3 | 1 | Users stay affected until then. Example: The weekly job runs in four days and conversions keep slipping.

### s3
text: How do you stop this from happening silently again?
- Add schema and null-rate checks on every feature, with alerts, before training and at serving => s4 | 2 | Make the data failure loud. Example: A rule fires when any feature null rate exceeds twice its training level for an hour.
- Ask engineers to watch the dashboard more closely => s4 | 0 | Humans miss slow change. Example: The dashboard has no input panel, so nobody can see the problem anyway.
- Retrain every day => s4 | 1 | More retraining does not detect data faults. Example: A daily retrain on bad inputs just refreshes the problem.

### s4
text: How will you know the model is still better than a simple approach?
- Report quality monthly against a simple baseline as labels arrive, and alert if the model stops beating it => end-win | 2 | A baseline shows slow decay. Example: Mean error is compared with last month average, and the alert fires when it passes the baseline.
- Trust the training metric => end-fail | 0 | It describes the past. Example: The test score from launch says nothing about this quarter.
- Compare only latency => end-ok | 1 | Latency says nothing about quality. Example: Both models are equally fast, so the comparison shows no difference.

### end-win
end: win
text: Input checks found the empty feature, the last good model was restored, and monitoring now covers data, predictions and quality against a baseline.
takeaway: Watch data and quality, not only speed and errors.

### end-ok
end: ok
text: The immediate harm was fixed, but quality is still not measured against a baseline.
takeaway: Add baseline reporting. Review the lesson and try the game again.

### end-fail
end: fail
text: Retraining on bad data and watching only speed let the problem continue.
takeaway: Fix the data, then retrain through a gate.

## The retrain that shipped a worse model
module: mlops
level: Advanced
minutes: 7
lesson: mlops/training-pipelines-and-testing-models-in-ci
summary: An automatic weekly retrain replaces the live model. This week it is worse for new customers.
intro: A pipeline retrains every Monday and promotes the result automatically. On Tuesday support reports poor suggestions for new customers.

### s1
text: The overall metric looks fine. Why were new customers affected?
- The average hid a drop in one group, and the release did not check groups => s2 | 2 | Averages hide group regressions. Example: Overall AUC moved by 0.003 while the new-customer slice fell by six points.
- Customers imagine it => s2 | 0 | Support has real examples. Example: Tickets include clear examples of poor suggestions.
- The network is slow => s2 | 0 | Latency would not change content. Example: Responses arrive in 40 ms but with weaker results.

### s2
text: What do you do now? Choose the move you would make next.
- Roll back to the previous model version, then investigate the data and the candidate => s3 | 2 | Restore service first. Example: The registry stage is moved back to version 13 in one command.
- Leave it and wait for next Monday => end-fail | 0 | Users stay affected. That does not deal with the real cause. Example: Another six days of poor suggestions.
- Retrain again immediately on the same data => s3 | 1 | It may give the same result. Example: The second run reproduces the weakness.

### s3
text: What change to the pipeline prevents a repeat?
- An evaluation gate comparing the candidate with production on fixed data, including named groups, before promotion => s4 | 2 | Automate the comparison. Example: The gate blocks any candidate that is worse than the baseline for new customers.
- Remove automation entirely => s4 | 1 | Manual steps bring other risks. Example: A person forgets to check, and the next change slips through.
- Promote only on Fridays => s4 | 0 | Timing does not change quality. Example: The same weak model ships on a different day.

### s4
text: How do you release future retrains safely?
- Shadow or canary a small share of traffic with quality checks, then promote in steps with rollback ready => end-win | 2 | Expose gradually. Example: Five percent of traffic runs the new model for a day with quality alerts.
- Send all traffic at once => end-fail | 0 | Maximum exposure. Example: Every user sees the weaker model before any check.
- Test only on a laptop => end-ok | 1 | It misses real traffic. Example: Laptop data lacks the live mix of customers.

### end-win
end: win
text: A gate with group checks blocks weak candidates, rollback is one command, and releases go through a canary.
takeaway: Gate on groups, release in steps, keep rollback ready.

### end-ok
end: ok
text: The service was restored, but releases still lack a group-aware gate and a canary.
takeaway: Add both. Review the lesson and try the game again.

### end-fail
end: fail
text: Leaving the model live or retraining blindly kept users affected.
takeaway: Roll back first, then fix the process.

## The recommendations that stopped converting
module: mlops
level: Intermediate
minutes: 7
lesson: mlops/debugging-ml-systems-in-production
summary: Conversions drop for two days while the service looks healthy. Debug from the data upward.
intro: A recommendation model has normal latency and no errors, yet conversion fell two days ago. A retrain changed nothing. You are on call.

### s1
text: Where do you start? Choose the move you would make next.
- List what changed in the last week, then compare input features with the training data => s2 | 2 | Most faults follow a change, and data is the cheapest layer to check. Example: A feature null rate jumped from 0.2 percent to 31 percent after an upstream schema change.
- Retrain the model again => s2 | 0 | It repeats an action that already failed. Example: The second retrain gives the same poor ranking because the inputs are still broken.
- Add more servers => s2 | 1 | Capacity is not the symptom. Example: Extra replicas answer just as quickly with the same poor results.

### s2
text: One feature differs from training. How do you tell skew from drift?
- Compute the feature offline for the same records and compare it with the served value => s3 | 2 | A difference on the same record is a code fault, not a change in the world. Example: The offline value is 4 and the served value is 96 because serving uses hours, not days.
- Assume it is drift and wait => s3 | 0 | Waiting leaves users affected and learns nothing. Example: Another week of poor ranking passes while the cause stays hidden.
- Delete the feature from the model => s3 | 1 | It hides the symptom and needs a retrain. Example: The model without the feature is weaker and nobody knows why.

### s3
text: How do you prove the model itself is fine?
- Replay a logged request with the same model version and inputs, then change one thing at a time => s4 | 2 | Replay isolates the layer and gives repeatable evidence. Example: Replaying with corrected input gives 0.81 where the logged output was 0.12.
- Ask users if the results feel better => s4 | 0 | Opinion is not evidence. Example: Two users disagree and the question stays open.
- Compare file sizes of the model => s4 | 1 | It says little about behaviour. Example: Both files are the same size and still behave differently with different inputs.

### s4
text: How do you stop this returning? Choose the move you would make next.
- Add a data check at the pipeline boundary, a shared feature code path, and an alert on the signal => end-win | 2 | It catches the fault early and removes the cause. Example: A null-rate rule now pages the owner on the day the upstream change lands.
- Remind the team to be careful => end-fail | 0 | Reminders do not scale. Example: The next upstream change happens during a holiday and nobody is watching.
- Retrain weekly => end-ok | 1 | It does not detect data faults. Example: A weekly retrain refreshes a model on the same broken input.

### end-win
end: win
text: The faulty feature was found, serving and training now share one code path, and a boundary check watches the data.
takeaway: Debug ML bottom-up and add the check that would have caught it.

### end-ok
end: ok
text: Quality recovered, but nothing yet stops the same upstream change from breaking the model again.
takeaway: Fix the cause and add the guard.

### end-fail
end: fail
text: Repeated retrains kept the broken input and the conversion loss continued.
takeaway: Check the data before changing the model.

