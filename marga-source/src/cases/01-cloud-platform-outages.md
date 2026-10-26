## AWS S3 outage in US-East-1
company: Amazon Web Services
year: 2017
area: Cloud outage
modules: cloud, bash, sre
source: AWS post-event summary | https://aws.amazon.com/message/41926/
what: While debugging a slow billing system, an engineer ran a command meant to remove a few servers from an S3 subsystem. S3 in the busiest US region stopped serving requests for about four hours, and many sites that depend on it failed with it.
cause: The command took a larger set of servers than intended, including those for the index and placement subsystems. The tool had no minimum-capacity limit, and restarting those subsystems at that scale took far longer than expected.
fix: The tool now removes capacity slowly and refuses to go below a safe minimum. AWS began splitting the subsystems into smaller cells, and moved its status dashboard off S3.
lesson: Give destructive tools guard rails, practise full restarts of critical systems, and never host your status page on the thing it reports on.

## AWS Kinesis outage
company: Amazon Web Services
year: 2020
area: Cloud outage
modules: cloud, linux, sre
source: AWS post-event summary | https://aws.amazon.com/message/11201/
what: A routine capacity addition to the front-end fleet of Kinesis in US-East-1 led to a long outage. Services built on Kinesis, such as CloudWatch and Cognito, were affected for many hours.
cause: Every front-end server keeps a thread for each of the other servers. Adding servers pushed each machine past the operating system's thread limit, so servers could not build their view of the fleet.
fix: AWS moved to fewer, larger servers, added monitoring for thread counts, and began work to isolate Kinesis into cells and reduce internal dependencies.
lesson: Limits you have never hit are still limits. Monitor operating system ceilings and test capacity changes before doing them in production.

## AWS US-East-1 network congestion
company: Amazon Web Services
year: 2021
area: Cloud outage
modules: cloud, networking, observability
source: AWS post-event summary | https://aws.amazon.com/message/12721/
what: An automated scaling activity in AWS's internal network triggered a surge of connection attempts from many internal clients. The congestion degraded many services in US-East-1 for several hours.
cause: Devices connecting the internal network to the main network were overloaded. Monitoring and operator tools ran over the same congested path, so engineers had poor visibility and the status dashboard was hard to update.
fix: AWS changed the behaviour of the scaling activity, added capacity and isolation for the internal network, and moved operational tooling off the shared path.
lesson: Your monitoring and your recovery tools must not depend on the network they are meant to repair.

## AWS EBS re-mirroring storm
company: Amazon Web Services
year: 2011
area: Cloud outage
modules: cloud, sre
source: AWS post-event summary | https://aws.amazon.com/message/65648/
what: A network change during a capacity upgrade started a multi-day problem with EBS volumes in one US-East availability zone. Many customers lost access to volumes and could not create new ones.
cause: Traffic was shifted onto a lower-capacity network. Storage nodes lost contact with their replicas and all tried to re-mirror at once, exhausting free capacity and overloading the control plane.
fix: AWS added spare capacity, changed re-mirroring to back off, and improved the isolation of the control plane from one zone's trouble.
lesson: Automatic repair can become the outage. Rate-limit recovery actions and keep spare capacity for them.

## AWS DynamoDB metadata overload
company: Amazon Web Services
year: 2015
area: Cloud outage
modules: cloud, sre
source: AWS post-event summary | https://aws.amazon.com/message/5467D2/
what: DynamoDB in US-East-1 had elevated errors for several hours on a Sunday morning, which also affected other AWS services that rely on it.
cause: Storage servers ask a metadata service for their partition assignments. A brief network problem made requests time out, and the servers retried. A new feature had made the metadata responses larger, so the retries overloaded the metadata service.
fix: AWS added capacity to the metadata service, reduced the cost of each request, and improved how servers back off when requests fail.
lesson: Retries without backoff turn a short blip into a long outage. Watch how much work one request costs as features grow.

## Amazon Elastic Load Balancing state deletion
company: Amazon Web Services
year: 2012
area: Human error
modules: cloud, sre
source: AWS post-event summary | https://aws.amazon.com/message/680587/
what: On Christmas Eve a maintenance process deleted state data for some production load balancers in US-East-1. Streaming services such as Netflix saw heavy errors for several hours.
cause: A developer with access to production ran the process against live data by mistake. The deleted data was needed to route traffic, and recovering it from snapshots was slow.
fix: AWS tightened access to production data, added checks before destructive changes, and improved the speed of recovery from the saved state.
lesson: Limit who can touch production data, require a second check before deletions, and test how fast you can restore.

## AWS DynamoDB DNS race condition
company: Amazon Web Services
year: 2025
area: Cloud outage
modules: cloud, networking, sre
source: AWS post-event summary | https://aws.amazon.com/message/101925/
what: In October 2025 the regional DynamoDB endpoint in US-East-1 lost its DNS records. Applications could not find the service, and the failure spread to other AWS services, including instance launches and load balancers.
cause: A latent race condition between two automated components that manage DNS records left the endpoint with an empty record, and the automation could not repair it on its own.
fix: AWS disabled the affected automation, fixed the race condition and added protections, and reviewed how dependent services recover after a long outage.
lesson: Automation that edits DNS needs safeguards against writing an empty answer, and engineers need a manual way to recover when it fails.

## Amazon S3 gossip corruption
company: Amazon Web Services
year: 2008
area: Cloud outage
modules: cloud, sre
source: AWS service health report | https://status.aws.amazon.com/s3-20080720.html
what: In July 2008 S3 was unavailable or degraded for several hours. Requests failed because servers could not agree on the state of the system.
cause: A single corrupted bit in a gossip message spread between servers, which then spent their time processing bad state instead of serving requests.
fix: AWS added checksums to the gossip messages and changed how servers handle and discard bad state.
lesson: Protect internal messages with checksums, and design gossip protocols so one bad message cannot take over the system.

## Google Cloud authentication quota outage
company: Google
year: 2020
area: Cloud outage
modules: cloud, sre
source: Google Cloud incident report | https://status.cloud.google.com/incident/zall/20013
what: For about 45 minutes in December 2020 users could not sign in to many Google services, including Gmail and YouTube, and services that depended on Google authentication also failed.
cause: During a migration to a new quota system, the quota for the user ID service's storage was set to zero. The service could no longer write, so authentication failed.
fix: Google reverted the quota, then changed the quota system so that a drastic reduction triggers a safety check and an alert instead of taking effect.
lesson: Sudden, large reductions in a limit should be refused or reviewed. Treat quota changes like deployments.

## Google Cloud Service Control null pointer
company: Google
year: 2025
area: Deployment and release
modules: cloud, sre, cicd
source: Google Cloud incident report | https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW
what: In June 2025 a global outage of the Service Control component caused API requests to fail across many Google Cloud products and the services that depend on them.
cause: A new feature added extra quota checks. A policy with blank fields was replicated worldwide and triggered a null pointer error in code that had no feature flag and had not been tested with such data. Restarting tasks then overloaded the backing database.
fix: Google added a feature flag, improved error handling, and made restarts use randomised exponential backoff to avoid a stampede.
lesson: Ship new code paths behind flags, handle empty data, and make restarts spread out after a crash.

## Microsoft Azure South Central US lightning strike
company: Microsoft
year: 2018
area: Cloud outage
modules: cloud, sre
source: Azure post-incident review | https://azure.status.microsoft/en-us/status/history/
what: In September 2018 a lightning strike near a data center in South Central US caused a voltage surge that took cooling units offline. Servers shut down to protect themselves and many Azure services were disrupted, some for more than a day.
cause: The surge damaged power and cooling equipment. Temperatures rose, and storage and network hardware shut down. Some dependent services, such as Azure Active Directory, were also affected because their redundancy was not sufficient.
fix: Microsoft reviewed its power and cooling resilience and its zone and region redundancy, and changed how critical identity services are replicated.
lesson: Physical events happen. Check that your redundancy really is in separate failure domains.

## Microsoft Azure WAN router command
company: Microsoft
year: 2023
area: Configuration change
modules: cloud, networking, sre
source: Azure post-incident review | https://azure.status.microsoft/en-us/status/history/
what: In January 2023 a network change caused Azure services worldwide to lose connectivity for a couple of hours, including Microsoft 365 and Azure.
cause: A command to update an IP address on a router was sent to many routers at the same time instead of one at a time. The routers recalculated their forwarding tables together, and packets were dropped.
fix: Microsoft added checks that block risky commands from running on many devices at once and improved the speed of recovery.
lesson: Roll network changes out in small batches and block commands that touch the whole fleet.

## Microsoft Azure Front Door configuration change
company: Microsoft
year: 2025
area: Configuration change
modules: cloud, networking, cicd, ansible
source: Azure post-incident review | https://azure.status.microsoft/en-us/status/history/
what: In October 2025 Azure Front Door, Microsoft's global content delivery and routing service, had a major outage that affected Azure portal pages, websites and Microsoft services.
cause: A configuration change was deployed that bypassed the usual safety checks because of a software defect. Invalid configuration spread to many edge locations.
fix: Microsoft blocked further changes, rolled back to the last known good configuration, and strengthened validation and staged rollout of configuration.
lesson: Configuration is code. Validate it, deploy it in stages, and make sure the safety checks themselves cannot be skipped.

## Microsoft Azure leap day certificate bug
company: Microsoft
year: 2012
area: Time and dates
modules: cloud, python, sre
source: Azure blog summary | https://azure.microsoft.com/en-us/blog/summary-of-windows-azure-service-disruption-on-feb-29th-2012/
what: On 29 February 2012 virtual machines could not start in many Azure regions. An attempt to fix it caused further problems, and the disruption lasted many hours.
cause: The guest agent created certificates valid for one year by adding one to the year number. On leap day this produced 29 February 2013, which does not exist, so certificate creation failed and machines were marked unhealthy.
fix: Microsoft fixed the date calculation, and improved how failures in the agent are handled so that they do not cascade through the cluster.
lesson: Date arithmetic needs a real library and edge-case tests. Make failure handling stop at the smallest unit possible.

## Cloudflare regular expression outage
company: Cloudflare
year: 2019
area: Deployment and release
modules: cloud, python, cicd, sre
source: Cloudflare blog | https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/
what: In July 2019 Cloudflare's network returned errors for about half an hour. CPU use across its servers rose to the limit and web traffic stopped being served.
cause: A new web application firewall rule contained a regular expression with catastrophic backtracking. It was deployed to every server at once, and there was no limit on the CPU time one rule could use.
fix: Cloudflare used a global kill switch to disable the rule, then added CPU limits for rules, moved to a regex engine with guaranteed runtime, and changed deployment to a staged rollout.
lesson: Test patterns against hostile input, cap the resources any one rule can consume, and never deploy to the whole fleet at once.

## Cloudflare backbone congestion
company: Cloudflare
year: 2020
area: Configuration change
modules: networking, cloud, sre
source: Cloudflare blog | https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/
what: In July 2020 Cloudflare's network dropped a large share of traffic for roughly half an hour, and many sites became unreachable.
cause: A change to backbone router configuration, meant to relieve congestion in one data center, caused that location to attract far more traffic than it could handle and the problem spread across the network.
fix: Engineers reverted the change and the traffic returned. Cloudflare added more review for backbone changes and checks on how a change moves traffic.
lesson: A fix for congestion can create more. Know where your traffic will go before you change routing.

## Cloudflare 19 data centers outage
company: Cloudflare
year: 2022
area: Configuration change
modules: networking, cloud, sre
source: Cloudflare blog | https://blog.cloudflare.com/cloudflare-outage-on-june-21-2022/
what: In June 2022 Cloudflare lost traffic in 19 of its busiest data centers for over an hour, which affected many popular sites.
cause: A change that restructured network configuration to improve resilience reordered a rule in a router policy. In the affected locations, this caused routes to be withdrawn, so traffic could not enter.
fix: Cloudflare reverted the change, reworked its process so that changes reach the busiest data centers last, and added automated checks of the effect.
lesson: Roll changes out to the lowest-risk places first, and keep the ability to revert quickly.

## Cloudflare control plane power failure
company: Cloudflare
year: 2023
area: Cloud outage
modules: cloud, sre
source: Cloudflare blog | https://blog.cloudflare.com/post-mortem-on-cloudflare-control-plane-and-analytics-outage/
what: In November 2023 the Cloudflare dashboard and APIs were unavailable or degraded for many hours after a power problem at the data center that hosts its main control plane. Traffic to customer sites kept flowing.
cause: Power failed at the facility. Cloudflare's high-availability design had not been fully tested, and some services had an unexpected dependency on the failed site, so failover did not work as planned.
fix: Cloudflare worked to remove dependencies on one facility, test failover for all core services, and set stricter rules for control plane services.
lesson: A failover you have not tested is a guess. Separate the control plane from the data plane so customers keep working while you repair.

## Cloudflare Workers KV third-party dependency
company: Cloudflare
year: 2025
area: Cloud outage
modules: cloud, sre
source: Cloudflare blog | https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/
what: In June 2025 several Cloudflare products failed for a couple of hours, including Workers KV and services that depend on it, such as Access and WARP.
cause: The cold storage behind Workers KV relied on a third-party cloud provider that was having its own outage. The failure then spread to other services that depend on KV.
fix: Cloudflare began moving the storage to its own platform and added protections so that dependent services degrade gracefully.
lesson: Map your hidden dependencies, including those of the vendors you rely on, and decide what happens when each one disappears.

## Cloudflare bot management feature file
company: Cloudflare
year: 2025
area: Configuration change
modules: cloud, networking, sre
source: Cloudflare blog | https://blog.cloudflare.com/18-november-2025-outage/
what: In November 2025 a large part of Cloudflare's network began returning errors for several hours. At first it looked like an attack because the errors came and went.
cause: A database permissions change made a query return duplicate rows, which doubled the size of a feature file for the bot management system. The file exceeded a limit in the proxy software, which crashed. The file was regenerated every few minutes, so the failure flapped.
fix: Cloudflare stopped the bad file, restored a known good one, and added limits and validation for internally generated configuration files.
lesson: Treat internally generated files like untrusted input. Validate their size and content before the fleet loads them.

## Cloudflare leap second
company: Cloudflare
year: 2017
area: Time and dates
modules: linux, python, networking
source: Cloudflare blog | https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/
what: When the leap second was added at the end of 2016, some Cloudflare DNS resolvers returned errors for a short time and a fraction of requests failed.
cause: The software measured elapsed time by subtracting two readings of the wall clock. At the leap second the clock stepped back, producing a negative duration that the code did not expect, and it panicked.
fix: Cloudflare fixed the code to use a monotonic clock, which never goes backwards, and published the change.
lesson: Use monotonic time to measure durations and wall-clock time only to display dates.

## Dyn DNS attack
company: Dyn
year: 2016
area: Security
modules: networking, cloud, sre
source: Dyn analysis summary | https://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/
what: In October 2016 a large DDoS attack on the DNS provider Dyn made many popular sites, such as Twitter and Netflix, unreachable for users in parts of the world.
cause: A botnet of compromised internet-connected devices flooded Dyn's DNS servers. Resolvers that did not get answers retried, which added to the load. Many sites used Dyn as their only DNS provider.
fix: Dyn mitigated the attacks over several waves. Many customers then added a second DNS provider.
lesson: DNS is a single point of failure unless you use more than one independent provider. Expect retries to amplify an attack.

## Slack outage after the new year
company: Slack
year: 2021
area: Capacity and scaling
modules: cloud, networking, sre
source: Slack engineering | https://slack.engineering/slacks-outage-on-january-4th-2021/
what: On the first working Monday of 2021, Slack was unavailable for many users for several hours, just as traffic grew sharply after the holidays.
cause: The network connecting Slack's infrastructure on AWS became saturated. Autoscaling read the low CPU use of servers waiting on the network as spare capacity and scaled in, and the service that provisions new servers was itself starved of capacity.
fix: Slack and AWS raised network limits ahead of load, changed the autoscaling signals, and added headroom to the provisioning service.
lesson: Autoscale on signals that reflect real demand, and keep spare capacity for the tools that create capacity.

## Pokemon Go launch traffic
company: Niantic
year: 2016
area: Capacity and scaling
modules: cloud, kubernetes, sre
source: Google Cloud blog | https://cloud.google.com/blog/products/containers-kubernetes/bringing-pokemon-go-to-life-on-google-cloud
what: Pokemon Go launched in mid 2016 and traffic was many times what the team had planned for. It still stayed up much of the time on containers running on Kubernetes.
cause: The launch plan assumed a much smaller audience. Demand reached roughly 50 times the original target, so capacity, quotas and database limits were all tested at once.
fix: Niantic worked with Google engineers to add capacity quickly and to resize clusters and services while the game was live.
lesson: Plan for the best case as well as the worst, test scaling limits and quotas in advance, and keep a line to your cloud provider's engineers.

## Toyota factory shutdown from a full disk
company: Toyota
year: 2023
area: Capacity and scaling
modules: linux, cloud, sre
source: Toyota newsroom | https://global.toyota/en/newsroom/
what: In August 2023 Toyota halted all of its Japanese assembly lines for about a day because its system for ordering parts stopped working.
cause: During maintenance, servers ran out of disk space. The backup system used the same data store and had the same limit, so failing over to it did not help.
fix: Toyota expanded the capacity of the system and restarted the lines.
lesson: Monitor disk space with alerts well before it is full, and make sure a backup system does not share the limit that broke the main one.
