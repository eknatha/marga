## A request queue full of the same two things
level: junior
A platform team tracks what teams ask for over one quarter.

```text
Request type            Count   Hours each
new service repo           64    3
database for a service     41    5
certificate renewal         9    1
unusual network rule       12    8
misc                       30    ?
```
? Which work should the team turn into self-service first?
+ The new service repo and the database, because they are frequent and repeatable
- The unusual network rule, because it takes the longest each time
- Miscellaneous requests, because they are the most mixed
- None, because requests prove the team is needed
why: Self-service pays off where requests are frequent and similar. Repo creation is about 190 hours and databases about 205 hours in the quarter, against under 100 for the network rule. A queue is data about what to automate, and success looks like requests that no longer arrive.

## A template people stop using
level: mid
Adoption of a golden path has fallen over two quarters.

```text
Services created in quarter:   40  ->  38  ->  35
Using the path:                34  ->  27  ->  19
Reasons given for leaving:     runtime too old (7), cannot add a queue (5), slow pipeline (3)
Template last updated:         8 months ago
```
? What is the most useful next step?
+ Interview the teams that left, then update the runtime version and add an option for a queue
- Make the path mandatory for all new services
- Remove the exception form so teams stop leaving
- Wait, since the number of services is stable
why: The reasons are specific and fixable. Making it mandatory hides the signal and creates resentment. Exits are product feedback, so fix the top reasons and keep the template fresh.

## A catalog that sent a page to the wrong team
level: mid
An alert fired for the reporting service and woke a team that no longer owns it.

```text
service: reporting-api
owner: team-data-insights
last-changed: 14 months ago

team directory: team-data-insights   (disbanded 12 months ago)
```
? What control would have caught this earliest?
+ A scheduled check that every catalog owner exists in the team directory, with a ticket on failure
- A longer onboarding document
- Paging all teams for every alert
- Removing the owner field
why: Ownership data decays. A nightly check against the source of truth finds stale owners within a day, and it works without anyone remembering to update the file.

## A scaffolder that half worked
level: mid
A self-service workflow creates a repository and then registers it in the catalog.

```text
step 1 create repository ........ ok
step 2 add pipeline ............. ok
step 3 register in catalog ...... error: 503
result: workflow failed, no retry
(repository exists, owner unknown)
```
? How should the workflow be changed?
+ Make every step idempotent, retry with backoff, report failure to the requester, and sweep for repos without catalog entries
- Delete the repository silently on any failure
- Ask the requester to run the step again by hand
- Skip the catalog step
why: Self-service workflows fail partway. Idempotent steps with retries and a clear failure message let them finish safely, and a sweep catches the leftovers.

## A Database object that never becomes ready
level: senior
A team applied a custom Database resource and the app cannot connect an hour later.

```text
$ kubectl get database orders-db
NAME        SYNCED   READY
orders-db   True     False

$ kubectl describe database orders-db | tail -3
Message: cannot create instance: quota exceeded in region
```
? What should the platform change?
+ Surface the cloud error in the object status and alert when READY stays false past a limit
- Hide the status columns so users are not confused
- Tell teams to read the controller logs
- Remove quotas from the cloud account
why: An abstraction must be honest about failure. The error was known to the controller, so it belongs in the status the user reads, with an alert so nobody waits an hour.

## A policy that blocked a rollback
level: senior
During an incident an engineer tried to roll back a deployment.

```text
$ kubectl rollout undo deployment/api
Error from server: admission webhook denied the request:
missing required label cost-center

(the previous version predates the label requirement)
```
? What is the best long-term fix?
+ Apply the policy only to new or changed resources by date and test it against old versions and rollbacks
- Disable all admission policies
- Tell engineers to add labels during incidents
- Keep the policy and ignore rollbacks
why: A guardrail that blocks recovery is itself an outage risk. Scope it to new resources, test the rollback path, and keep a documented, audited break-glass route.

## Preview environments that never go away
level: mid
The cloud bill has grown steadily and a team suspects previews.

```text
namespaces named preview-*:   412
older than 14 days:           301
owner label present:          97
cleanup webhook errors (30d): 188
```
? What should be built?
+ A time-to-live label set at creation, a nightly sweep that deletes expired previews, and an alert on cleanup errors
- A monthly email asking people to delete previews
- A limit of one preview for the whole company
- Larger nodes
why: Cleanup that depends on an event or on memory will leak. Expiry set at creation and a sweep that does not rely on webhooks is the reliable design.

## Unallocated spend
level: mid
Finance wants spend by team and the platform can attribute most but not all.

```text
Total monthly spend:     $120,000
Allocated to teams:      $79,000
Shared (platform):       $14,000
Unallocated:             $27,000   (22 percent)
```
? What is the best first change?
+ Require owner and environment labels at creation with a policy and report the unallocated figure weekly
- Split the unallocated cost equally across teams
- Stop reporting until the figure is zero
- Charge it all to the platform team forever
why: Labels at creation fix the source. Equal splitting is unfair and hides the problem, and a weekly number makes shrinking it a goal someone owns.

## A ranking that changed behaviour
level: senior
A manager published a league table of teams by deployments per week.

```text
Before: 6 deploys/team/week, change failure rate 14%
After:  13 deploys/team/week, change failure rate 15%, rollbacks up 40%
```
? What does the data suggest?
+ Teams split changes into smaller deploys to raise the count, so the measure stopped describing delivery performance
- Delivery performance doubled
- The teams hired more engineers
- Rollbacks are unrelated
why: When a measure becomes a target people optimise it. Use the numbers privately with the team to find friction and pair them with outcome measures such as failure rate.

## An old pipeline nobody retired
level: senior
A security fix reached most services but not all.

```text
services on the new platform pipeline: 118
services on the legacy pipeline:       10
legacy pipeline owner:                 (none)
legacy credentials last rotated:       22 months ago
```
? What should the migration plan add?
+ A dated removal of the legacy pipeline, an owner for each remaining service, and revoking its credentials after the move
- Leave it running in case it is needed
- Ask teams to migrate when convenient
- Add more documentation only
why: A migration is complete only when the old path is gone. Unowned pipelines with old credentials are both a risk and a source of drift.
