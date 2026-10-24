---
title: Testing strategy and quality gates
minutes: 15
summary: Decide which tests run where in a pipeline, keep them fast and reliable, handle flaky tests, and turn coverage, linting and security checks into enforced gates.
---

A pipeline that builds but does not test only delivers bugs faster. A pipeline with slow, flaky tests teaches people to ignore red builds. Good test strategy gives fast feedback first and expensive confidence later, and treats failures as information you can trust.

## What you will learn

- The test pyramid and what belongs at each level
- Ordering pipeline stages for fast feedback
- Quality gates: linting, coverage thresholds and static analysis
- Dealing with flaky tests and slow suites

## The test pyramid

| Level | What it checks | Speed | How many |
|-------|----------------|-------|----------|
| Unit | One function or class, no network or disk | Milliseconds | Thousands |
| Integration | A component with a real database, queue or API | Seconds | Hundreds |
| End to end | The deployed system through its public interface | Minutes | A few dozen |
| Smoke | "Is the deployed service alive and answering?" | Seconds | A handful |

The shape matters. Many fast unit tests find most defects cheaply. A few end-to-end tests prove the pieces work together. An inverted pyramid, with mostly slow browser tests, produces pipelines that take an hour and fail for reasons unrelated to the change.

## Ordering stages for fast feedback

Run the cheapest, most informative checks first and stop at the first failure. Run independent checks in parallel.

```yaml
stages: [lint, test, build, scan, deploy-staging, smoke]

lint:
  stage: lint
  script:
    - ruff check .
    - yamllint deploy/
    - hadolint Dockerfile

unit:
  stage: test
  script:
    - python -m pytest tests/unit -q --cov=app --cov-fail-under=80

integration:
  stage: test
  services:
    - postgres:16
  script:
    - python -m pytest tests/integration -q

build-image:
  stage: build
  script:
    - docker build -t registry.example.com/shop/api:${BUILD_ID} .

scan-image:
  stage: scan
  script:
    - trivy image --exit-code 1 --severity CRITICAL registry.example.com/shop/api:${BUILD_ID}

smoke:
  stage: smoke
  script:
    - curl -fsS -m 10 https://staging.example.com/healthz
```

Lint finishes in seconds and catches typos and style problems before anyone waits for tests. The scan only runs on an image that built successfully. The smoke test runs against the freshly deployed staging environment.

## Quality gates

A **gate** is an automatic pass or fail rule. Useful gates include a minimum coverage threshold, no new high-severity static-analysis findings, no known critical vulnerabilities, and formatting that matches the project style.

```console
$ python -m pytest --cov=app --cov-report=term-missing --cov-fail-under=80
$ ruff check . && ruff format --check .
$ shellcheck scripts/*.sh
$ terraform fmt -check -recursive
$ kubeconform -strict -summary k8s/
```

Set gates you will actually enforce. A coverage target nobody respects is noise. Prefer "coverage on changed lines must not fall" over one global number, and avoid chasing 100 percent: tests that exist only to touch lines add cost without finding bugs.

## Flaky tests

A flaky test passes and fails with no code change. Common causes are timing assumptions, shared state between tests, order dependence, real network calls and clocks.

- Replace `sleep` with waiting for a condition
- Give each test its own data and clean it up
- Freeze or inject the clock
- Mock external services in unit tests
- Run the suite in random order to expose hidden dependencies

When a flaky test is found, **quarantine it quickly**: move it to a non-blocking job, open a ticket with an owner and a deadline, and fix or delete it. Automatically re-running failures hides the problem and trains people to distrust red builds.

## Keeping the pipeline fast

```console
$ python -m pytest -q --durations=10
$ python -m pytest -q -n auto
$ docker build --cache-from registry.example.com/shop/api:cache -t shop-api:test .
```

Aim for the commit-to-feedback loop under ten minutes. Cache dependencies, run tests in parallel, run only affected tests where tooling supports it, and move slow suites to a nightly job while keeping a representative subset on every change.

## Incident: the green build that broke production

> **Incident:** A change passes every check and deploys. Within minutes checkout fails: the new code reads a database column that exists in the test database but not in production, because a migration was never applied to the production schema.

Unit tests mocked the database, and the integration tests ran against a schema created fresh from the model, not from the real migration history. Close the gap:

```console
$ python manage.py migrate --plan
$ python manage.py makemigrations --check --dry-run
$ curl -fsS https://staging.example.com/healthz/db
```

Run integration tests against a database built by the same migrations that production uses, apply migrations in the pipeline before the application rollout, and add a smoke check that exercises a database-backed endpoint. Add a regression test for this exact case.

## Common mistakes

- Letting the pipeline get slower until people skip it
- Automatically retrying flaky tests instead of fixing them
- Mocking everything so tests never touch real behaviour
- Coverage thresholds that are never enforced or are gamed
- Running end-to-end tests against shared, unstable environments

```quiz
Q: Why keep most tests at the unit level?
- Unit tests are required by law
+ They are fast and cheap, so failures are found early and precisely
- They test the whole system
- They need no code
> The pyramid shape keeps feedback fast and maintenance low.

Q: Why run lint before slow tests?
- Lint results are more accurate
+ It fails in seconds and saves waiting for expensive stages
- Tests need lint to run
- It is a security requirement
> Order stages from cheapest to most expensive.

Q: What is a good response to a flaky test?
- Re-run it until it passes
+ Quarantine it, assign an owner and fix or remove it
- Ignore all failures
- Disable the pipeline
> Retrying hides the problem and erodes trust in the build.

Q: What does a quality gate do?
+ Automatically fails the pipeline when a defined standard is not met
- Deploys to production
- Writes tests for you
- Increases coverage
> Gates turn standards into enforced rules.
```

```cards
Test pyramid in one line? :: Many fast unit tests, fewer integration tests, very few end-to-end tests
What is a smoke test? :: A quick check that a deployed service is alive and answering
Why avoid auto-retrying failures? :: It masks flaky tests and lets real intermittent bugs through
What belongs in a gate? :: Lint, coverage on changed code, static analysis, critical vulnerability scan
```
