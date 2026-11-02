## Passes locally, fails in the pipeline
level: junior
A job that runs Terraform formatting checks passes on laptops but fails on the build server.

```text
$ terraform fmt -check
Error: Unsupported argument
  on main.tf line 12: An argument named "optional_attr" is not expected here.

# laptop:  Terraform v1.9.5
# runner:  Terraform v1.3.0
```
? What is the best long-term fix?
+ Pin the tool versions in the pipeline image and in the project, and use the same versions everywhere
- Ask developers to downgrade their laptops
- Disable the check in the pipeline
- Retry the job until it passes
why: Different tool versions are a common cause of "works on my machine". Pin versions in a container image or a version file, use the same image for local checks if possible, and update the pin deliberately through a reviewed change.

## The rollback deployed new code
level: mid
A bad release is rolled back by re-running the previous deployment job, yet users still see the new behaviour.

```text
deploy:
  script:
    - docker build -t shop:latest .
    - docker push registry.example/shop:latest
    - kubectl set image deploy/shop shop=registry.example/shop:latest
```
? What is wrong with this design?
+ The job rebuilds from source and uses a mutable latest tag, so a rerun does not deploy the previous artifact
- The registry is too slow
- kubectl cannot update images
- The pipeline needs more runners
why: A rollback must deploy something that already exists. Build once, tag the image with an immutable identifier such as the commit hash or a version, store it, and deploy by that tag. Re-running an old pipeline then deploys the same bytes. Better, promote the same artifact through each environment and keep the previous tag for quick rollback.

## The test that fails one run in five
level: mid
Developers re-run the pipeline until it goes green. Test results from the last 20 runs:

```text
test_checkout_total   PASS PASS PASS FAIL PASS PASS PASS PASS FAIL PASS
test_cache_expiry     PASS PASS PASS PASS PASS PASS PASS PASS PASS PASS
test_order_ids        PASS FAIL PASS PASS PASS FAIL PASS PASS PASS PASS
```
? What is the best response?
+ Quarantine the flaky tests, find the cause such as shared state or time dependence, and fix them
- Add automatic retries to all tests and ignore the cause
- Remove the test stage
- Only run tests on release days
why: Flaky tests teach people to ignore failures, which hides real ones. Retry-until-green makes the pipeline slow and untrustworthy. Move the unstable tests out of the blocking path, track them, and fix root causes such as shared data between tests, ordering, real clocks, or network calls. Then return them to the blocking suite.

## Pipeline passes but the wrong image is deployed
level: mid
The pipeline is green, yet production runs old code after a release. The deploy step uses a tag.

```text
build:  docker build -t shop/api:latest .
push:   docker push shop/api:latest
deploy: kubectl set image deploy/api api=shop/api:latest

$ kubectl rollout status deploy/api
deployment "api" successfully rolled out
```
? What is the most likely problem and fix?
+ The mutable latest tag did not change in the manifest, so nothing rolled. Deploy an immutable tag such as the commit ID, or the image digest
- The cluster has too little memory
- The registry is down
- The pipeline needs more runners
why: Setting the same image string gives no change to the pod template, so Kubernetes starts no new pods. Even with a restart, nodes may use a cached latest. Tag each build with a unique value, such as the commit hash, and deploy that exact tag or digest. You can then say what runs in production and roll back to a known tag.

## Secrets appear in the build log
level: mid
A reviewer finds an API token in the output of a pipeline job.

```text
+ curl -H "Authorization: Bearer 9f8a...c41" https://api.example.com/deploy
+ echo "token is 9f8a...c41"
```
? What is the right response?
+ Revoke and rotate the token now, then stop printing it, use masked secret variables, and avoid shell tracing around commands that use secrets
- Delete the log and keep the token
- Make the repository private and keep the token
- Shorten the retention of the logs only
why: Anyone who could read the log may have copied the token, so it must be treated as exposed. Rotate first. Then fix the cause: shell tracing printed the command, and an echo printed the value. Use the masking feature of the CI system, keep secrets out of the command line where possible, and give each token the smallest scope.

## Pipeline is slow and getting slower
level: mid
Builds took 6 minutes last quarter. They now take 28.

```text
Stage            Duration
checkout         0:20
install deps     9:40   (no cache hit)
unit tests       11:10  (single worker)
build image      4:30
deploy           2:20
```
? Which change is likely to help most?
+ Cache dependencies by lock file hash and split the tests across parallel workers
- Remove the unit tests
- Add a second deploy stage
- Run the pipeline less often
why: Two stages account for most of the time. A dependency cache keyed on the lock file avoids the download, and parallel workers cut the test stage. Removing tests trades speed for risk. Measure each stage after the change.

## Deploy job applied to the wrong environment
level: senior
A change meant for staging was released to production.

```text
deploy:
  script: kubectl apply -f k8s/ 
  variables: { KUBECONFIG: $PROD_KUBECONFIG }
  rules: [ { if: $CI_COMMIT_BRANCH } ]
```
? What went wrong and how would you prevent it?
+ The job runs for every branch with the production credential. Restrict it to the protected release branch, use separate environments with approvals, and give staging jobs only staging credentials
- Rename the variable
- Ask developers to be careful
- Use a longer timeout
why: Any branch could deploy to production because the rule has no limits and the credential was available to every job. Protected environments, branch rules and per-environment credentials make the safe path the default.
