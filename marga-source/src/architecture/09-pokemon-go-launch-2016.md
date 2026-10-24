# Pokemon Go launch, July 2016
company: Niantic and Google Cloud
date: July 2016
modules: cloud, kubernetes, sre
calc: capacity, cloud-cost
source: Google Cloud blog | https://cloud.google.com/blog/products/containers-kubernetes/bringing-pokemon-go-to-life-on-google-cloud
summary: Demand reached about fifty times the launch target, and the team scaled a live game while players were using it.

## Before you read on
Your launch plan has a target and a worst case of several times that target. Real demand turns out to be much higher than the worst case. Which limits do you hit first: quotas, databases, load balancers or people?

## The system
The game's back end ran on Google Cloud, using containers on Kubernetes for the application and a managed database for player data. A launch in a few countries first allowed the team to see traffic before releasing worldwide.

## Timeline as reported
- Niantic planned for a worst case that was a multiple of its target traffic.
- After launch in the first countries, usage was far above the plan, reportedly about 50 times the target.
- Engineers from Niantic and Google worked together during the launch to add capacity, adjust quotas and tune the system, and the game stayed up for much of the time despite the load.
- The launch in other countries was staged, which gave the teams time to add capacity before each new wave of players.

## Root cause
There was no failure of design so much as a planning gap: demand was far outside the range that had been planned for. The design's ability to scale horizontally was what let the team respond.

## What changed
- Capacity and database limits were raised in stages, and the team gained experience in running at scale with a live game.
- The approach of staged regional releases became a model for later launches.

## Trade-offs to weigh
- **Launch everywhere or stage it.** A staged launch limits risk and delays revenue and excitement.
- **Provision for the worst case or scale on demand.** Provisioning ahead costs money for idle capacity. Scaling on demand needs headroom in quotas and database limits.
- **Managed services against control.** They scale for you up to limits that you must know.

## Try the calculators
In the capacity calculator, enter a target of 1,000 requests per second and then 50,000. See how many servers the larger load needs. In the cloud cost calculator, check what happens to monthly cost if the extra servers are only needed for 100 hours a month.
