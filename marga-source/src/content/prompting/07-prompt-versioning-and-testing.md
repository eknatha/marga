---
title: Prompt versioning and testing
minutes: 12
summary: Store prompts as versioned files, review changes, run them against an evaluation set in CI, and roll out and back safely.
---

A prompt is part of your program. A single changed sentence can raise or collapse accuracy. Treat prompts like code: keep them in version control, review changes, test them automatically, release them deliberately and be able to go back.

## What you will learn

- Prompts as files with templates and variables
- Review and changelog
- Automated evaluation in CI
- Gradual rollout and rollback

## Files, not strings in code

Store each prompt in its own file with a name and version, and load it at run time. Use placeholders for variables and escape or delimit untrusted values.

```text
# prompts/triage/v7.txt
# changed: added "unknown" category and an example for refunds
<rules>...</rules>
<ticket>{{ticket}}</ticket>
```

```python
from pathlib import Path

def load_prompt(name, version):
    return Path(f"prompts/{name}/v{version}.txt").read_text()
```

Keep the model name, temperature and schema version alongside the prompt in a small config, so one version identifier describes the whole behaviour.

## Review changes

Review a prompt change like code: what problem does it fix, which cases could it break, what do the evaluation results say? Small diffs are better than rewrites. Keep a changelog line in the file. Record who approved changes to prompts that affect customers or money.

## Test in CI

Run your evaluation set on every change to prompts, schemas, models and retrieval settings. Fail the build when the pass rate drops below a threshold or when a critical case fails. Run the cheap checks (format, schema) on every commit and the full set, which costs money, on pull requests and nightly. Pin the model version in tests so results are comparable, and run again when you upgrade.

## Roll out and back

Release a new prompt to a small percentage of traffic first, compare quality, errors, cost and latency, then widen. Keep the previous version deployable by changing a configuration value, not code. Log the prompt version with every request, so a complaint can be traced to the version that produced it. Decide who may change a production prompt, and how fast you can revert.

```predict
Q: A teammate edits a production prompt in an admin page to fix one complaint. What risks are there and what process would you use instead?
???
No review, no tests, and no way back. Change the file, run the evaluation set, review, roll out gradually, and record the version.
> Treat prompts as code.
```

## Incident: The one-word edit

> **Incident:** A well-meant edit to a prompt silently broke date handling.

```console
$ python run_evals.py --prompt triage --version 8
pass_rate=0.82 (v7: 0.95)   new_failures=dates_in_other_formats(9)
$ git log -1 --stat prompts/triage/v8.txt
  prompts/triage/v8.txt | 2 +-
```

The edit changed "Return dates as YYYY-MM-DD" to "Return dates normally". Because evaluations run in CI, the drop showed on the pull request. The change was reverted, the rule was kept explicit, and a case for other date formats stayed in the test set.

## Common mistakes

- Editing production prompts by hand
- No evaluation before release
- No record of which version served a request
- Changing prompt and model at once

```quiz
Q: Where should prompts live?
+ In versioned files with review
- In chat messages :: Lost.
- In people's heads :: Lost.
- In a sticky note :: Lost.
> Prompts are code. Re-read the matching lesson section for the full reasoning.

Q: What should CI do for prompt changes?
+ Run the evaluation set and fail below a threshold
- Nothing :: Risky.
- Delete the prompt :: No.
- Send email :: Not tests.
> Gate releases. Re-read the matching lesson section for the full reasoning.

Q: What should every request log?
+ The prompt version
- The CEO name :: No.
- The weather :: No.
- The wallpaper :: No.
> Trace complaints. Re-read the matching lesson section for the full reasoning.

Q: How do you release safely?
+ Gradually, with an easy rollback
- To everyone at once :: Risky.
- Without tests :: Risky.
- At night only :: Not a control.
> Canary then widen. Re-read the matching lesson section for the full reasoning.
```

```cards
Store :: prompts/NAME/vN.txt with config
Review :: small diffs and a changelog
CI :: evaluation set, threshold gate
Pin :: model version in tests
Release :: canary, then widen
Log :: prompt version per request
```
