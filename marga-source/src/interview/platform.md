## What is platform engineering and how does it differ from DevOps and SRE?
level: junior
DevOps is a culture of shared ownership between building and running software. SRE applies engineering to reliability with SLOs and error budgets. Platform engineering builds an internal product of self-service capabilities so teams can follow good practice with less effort. They overlap, and a platform team often uses SRE methods and serves DevOps goals.

## What is a golden path and how do you stop it becoming a cage?
level: mid
A golden path is a supported, automated way to do a common job with sensible defaults. To avoid a cage, make it optional, offer documented ways to customise, track why teams leave and treat exits as feedback, and keep paths updated by pull request so staying on the path is cheaper than leaving.

## How would you decide whether a company needs a platform team?
level: mid
I would size the repeated work across teams, count how many hours are spent on it and name the customers. With a few teams a template repository and shared documentation is often enough. A dedicated team is justified when many teams repeat the same work and the saved hours exceed the cost of the team.

## How do you measure whether a platform is succeeding?
level: senior
I use a mix: voluntary adoption, time to first deploy for a new service, onboarding time, DORA measures per team, developer survey results and platform reliability measures. I avoid ranking teams on one activity count, because a measure that becomes a target stops being reliable.

## How would you keep a service catalog accurate?
level: mid
Keep descriptors in the code repository so owners change them with the code, require a valid owning team, run automated checks that owners exist and links work, and show freshness. Start with critical services and make the first page useful to on-call engineers so people care to keep it right.

## How do you design guardrails that do not slow teams down?
level: senior
Prefer secure defaults, then automated checks with messages that say what is wrong, why and how to fix it. Roll policies out through audit, warn and enforce, apply them to new resources first, test rollbacks, keep time-limited exceptions and reserve manual gates for rare high-risk actions.
