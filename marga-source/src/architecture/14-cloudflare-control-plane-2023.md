# Cloudflare control plane and power loss, November 2023
company: Cloudflare
date: 2 November 2023
modules: cloud, sre, observability
calc: redundancy, recovery
source: Cloudflare blog: Post mortem on Cloudflare Control Plane and Analytics outage | https://blog.cloudflare.com/post-mortem-on-cloudflare-control-plane-and-analytics-outage/
summary: A power incident at a data centre provider, and a failover that had never been tested as a whole, took Cloudflare dashboards and APIs offline for about two days.

## Before you read on
Your control plane runs mainly in one data centre, with a standby elsewhere. Has anyone ever switched everything to the standby on purpose, with the main site fully off?

## The system
Cloudflare splits its work into a data plane, which serves customer traffic at the edge, and a control plane, which holds the dashboard, the API and the configuration. The control plane ran mostly in one main data centre in Oregon, with a standby facility in another region.

## Timeline as reported
- Power was lost at the data centre provider, and as reported, a series of events followed in the facility, including a failure to keep power through a ground fault and batteries that did not last as expected.
- The control plane services in that facility went down. The edge kept serving traffic, because it does not depend on the control plane for each request.
- The failover to the standby facility did not work as planned. Some services had hidden dependencies on the main site, and some were not designed to start with the main site gone.
- Engineers rebuilt the services in the standby facility and found that some of them had to be started in a certain order.
- Customers could not change settings or view analytics for roughly two days, and normal service returned after the main site recovered.

## Root cause
The failover design had not been tested as a whole, and some services depended on others that lived only in the main data centre. The provider event started it, and the untested standby made it last.

## What changed
- Cloudflare said it would remove the dependencies on the main site, so that the standby could carry the load.
- It also set out regular full failover tests, and reviewed which services were critical and needed high availability.

## Lessons learned
- Test a complete failover of the control plane with the main site off.
- Find hidden dependencies on the main data centre and remove them.
- Keep customer traffic independent of the control plane, as this event showed.
- Order and document the start-up of services from cold.

## Trade-offs to weigh
- **Separate data plane and control plane.** This kept customer traffic flowing. The price is two systems with different availability goals.
- **Testing a failover against its risk.** A full test can cause an outage. Not testing makes a worse outage nearly certain.
- **Standby cost against recovery speed.** A warm standby costs money every day. A cold one costs time in the incident.

## Try the calculators
In the redundancy calculator, see what a standby is worth if it works only some of the time. In the backup, RTO and RPO calculator, set a recovery speed and see the downtime that follows.
