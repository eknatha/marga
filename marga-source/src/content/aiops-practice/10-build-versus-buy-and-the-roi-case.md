---
title: Build versus buy and the ROI case
minutes: 13
summary: Decide what to build, buy or assemble, evaluate vendors with your own incidents, and show value with a measured before-and-after rather than a slide of promises.
---

The AIOps market is full of confident claims. A calm decision process protects your budget and your team's time. The same measurements you use to evaluate your own tools also decide whether a purchase is worth it.

## What you will learn

- A framework for build, buy or assemble
- A vendor evaluation that uses your data
- Hidden costs of each route
- How to calculate and report return on investment

## Build, buy or assemble

**Build** when the capability is specific to your systems and the logic is simple: change correlation, grouping rules, an incident summary bot. **Buy** when the problem is generic, the data is already inside the vendor's platform, and running it yourself would be a distraction: log anomaly detection inside your logging product, for example. **Assemble** by combining open-source components, such as Prometheus, OpenTelemetry, a feature store and an LLM, when you want control without writing everything. Most teams end up with a mix.

## Questions that decide

How much of the value comes from the model and how much from your data and integrations? Does the vendor need your data in their cloud, and is that allowed? Can you export your data and configuration if you leave? Who tunes and owns it? How does it behave when the vendor is down? What does the pager do?

## Evaluate on your own incidents

Do not accept a demo on the vendor's data. Provide a sample from your labelled incident set, with sensitive fields redacted, and measure the tool with the same metrics as in the last lesson: detection lead time, false alarms, grouping accuracy, root-cause top-3 accuracy. Run a proof of concept in shadow mode for 4 to 8 weeks. Define success numbers before it starts and write them into the agreement.

## Vendor checklist

Data residency and retention, redaction options, model training on your data (opt in or out), role-based access, audit logs, explanations for every output, API access, export formats, a kill switch for automation, uptime history, pricing based on data volume or hosts (and what happens when volume doubles), and references from similar environments.

## Total cost

Include licence, data ingest and egress, integration work, tuning time, training, review meetings and the time spent handling its false positives. For building, include maintenance, on-call for the tool itself and the cost of the people who understand it. A free tool that needs a full-time engineer is not free.

## Calculating return

Pick a few measured outcomes and put numbers beside them: pages per week, hours of toil, mean time to acknowledge and resolve, incident minutes of customer impact, engineer hours in incident triage. Take a baseline before the change, then measure the same things afterwards. Convert to money carefully: use engineer hours saved, and the cost of downtime only where you have a credible figure. State what you did not count.

```python
def roi(baseline, after, hourly_cost, annual_cost, weeks=52):
    saved_hours = (baseline["triage_hours_week"] - after["triage_hours_week"]) * weeks
    saved_pages = (baseline["pages_week"] - after["pages_week"]) * weeks
    value = saved_hours * hourly_cost
    return {
        "hours_saved": round(saved_hours),
        "pages_avoided": round(saved_pages),
        "value": round(value),
        "net": round(value - annual_cost),
        "payback_months": round(annual_cost / (value / 12), 1) if value else None,
    }

before = {"triage_hours_week": 46, "pages_week": 180}
after = {"triage_hours_week": 31, "pages_week": 70}
print(roi(before, after, hourly_cost=85, annual_cost=60000))
```

This counts only engineer time and reports the pages avoided as a separate, non-monetary benefit. Showing the net and payback gives a decision-maker something to compare with other projects.

## Avoid the hype traps

Be careful with phrases such as "eliminates alert fatigue" or "finds root cause automatically". Ask for the measured numbers and the conditions. Ask what happens on a service with little history or poor telemetry, because that is where promises usually fail.

```diagram
title: Deciding and proving value
node: need | Problem and baseline | 0 | 1 | A measured pain: pages, triage hours, MTTR. | No baseline, so no proof later. | observe
node: route | Build, buy or assemble | 1 | 1 | Chosen by data fit, ownership and exit options. | Choosing by demo polish. | process
node: poc | Proof in shadow mode | 2 | 0 | Vendor or build tested on your redacted incidents. | A demo on the vendor's own data. | service
node: cost | Total cost | 2 | 2 | Licence, data, integration, tuning and false positives. | Counting only the licence. | store
node: gate | Success numbers | 3 | 1 | Agreed targets for the decision. | Moving the goalposts afterwards. | security
node: roi | Measured ROI | 4 | 1 | Before and after with what was not counted. | Quoting savings no one measured. | external
edge: need | route
edge: route | poc
edge: route | cost
edge: poc | gate
edge: cost | gate
edge: gate | roi
```

## Incident: The tool that reduced nothing

> **Incident:** A team bought an alert noise reduction product and reported success after a quarter because the dashboard showed fewer incidents.

```console
$ alertreport --team platform --compare Q2,Q3
alerts:          2210 -> 2190
tickets opened:  310  -> 305
incidents (vendor-grouped): 540 -> 190
user-reported incidents: 6 -> 9
(this is a simulated illustration, not a real incident)
```

The vendor's grouping had renamed alerts as fewer "incidents" while actual alerts and tickets were unchanged, and incidents reported by users rose. The team defined its own measures, set targets, and renegotiated the contract around them.

## Common mistakes

- Evaluating on the vendor's demo data
- Counting only the licence cost
- Accepting the vendor's own metrics
- Taking no baseline before the change
- No exit plan for data and configuration

```quiz
Q: When is building usually a good choice?
+ When the logic is specific to your systems and fairly simple
- When the problem is generic and data is in the vendor platform :: Buying fits.
- Never :: Sometimes it fits.
- Only for large companies :: Not required.
> Change correlation and grouping rules are common examples.

Q: How should you evaluate a vendor?
+ On your own redacted incidents, in shadow mode, with targets set in advance
- With the vendor's demo :: Not your data.
- By reading reviews only :: Not evidence.
- By trying it for a day :: Too short.
> Use your labelled incidents and agreed numbers.

Q: What belongs in total cost?
+ Licence, data costs, integration, tuning and handling false positives
- Licence only :: Misses most cost.
- Hardware only :: Incomplete.
- Training data only :: Incomplete.
> Hidden effort often exceeds the licence.

Q: What is needed to show return?
+ A baseline before the change and the same measures afterwards
- A vendor slide :: Not your measurement.
- A survey of opinions only :: Soft evidence.
- A new dashboard :: Does not prove change.
> Without a baseline, savings cannot be shown.
```

```cards
Build versus buy :: Choosing to write a capability or purchase it
Proof of concept :: A short trial of a tool on your own data
Total cost of ownership :: All costs of running a tool, not just the licence
Baseline :: Measurements taken before a change for later comparison
Exit plan :: How to move your data and configuration away from a vendor
```
