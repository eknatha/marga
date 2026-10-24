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
