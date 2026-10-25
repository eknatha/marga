## Sentry Postgres transaction ID wraparound
company: Sentry
year: 2015
area: Databases
modules: linux, observability, sre
source: Sentry engineering blog | https://blog.sentry.io/transaction-id-wraparound-in-postgres
what: On Monday 20 July 2015 the hosted Sentry service was down for most of the US working day because its main Postgres database stopped accepting writes.
cause: Postgres uses a limited counter for transaction IDs and needs routine vacuuming to recycle them. A write-heavy workload and very large tables let autovacuum fall behind. When the counter neared its limit, Postgres halted writes on purpose to avoid corrupting data visibility. One autovacuum run also failed without a clear log message.
fix: Engineers let the vacuums finish on new, faster hardware and truncated one very large table that held non-critical data, which freed the blocked writes within minutes. They then made autovacuum more aggressive, added more workers and set up monitoring of vacuum progress and transaction ID age.
lesson: Monitor the age of transaction IDs and the progress of autovacuum before they become an outage, and never loosen vacuum settings on a busy database.

## Mandrill Postgres transaction ID wraparound
company: Mailchimp (Mandrill)
year: 2019
area: Databases
modules: sre, observability, linux
source: Mailchimp write-up | https://mailchimp.com/what-we-learned-from-the-recent-mandrill-outage/
what: From 4 February 2019 Mandrill, the transactional email service of Mailchimp, was impaired for about 41 hours and queues took until 6 February to return to normal.
cause: One database shard received more writes than the others because of uneven hashing. Autovacuum fell behind, so the shard hit the Postgres transaction ID limit and entered safety shutdown. The risk had been noted three months earlier but judged not urgent. Retried writes added load, queued jobs filled the disks of application servers, and the first error was buried in unrelated log noise.
fix: The team truncated two very large tables to release the locked transaction IDs so that vacuum could finish, because a full vacuum was estimated to take weeks. They added alerts for wraparound risk, improved logging and spread knowledge of the system across more people.
lesson: A known and deferred risk is a scheduled outage; alert on it, and keep logs and runbooks independent of the disks that are failing.

## Zalando cluster DNS outage
company: Zalando
year: 2019
area: Kubernetes
modules: kubernetes, networking, observability
source: Zalando post-mortem | https://kubernetes-on-aws.readthedocs.io/en/latest/postmortems/jan-2019-dns-outage.html
what: On 7 January 2019 product pages of the Zalando fashion store returned errors for more than an hour because DNS stopped working in one Kubernetes cluster.
cause: The cluster DNS pods had a low memory limit. A burst of retries after a downstream timeout raised the number of DNS lookups, which were multiplied by the default search domain setting and by a service that did not cache lookups. The DNS pods ran out of memory, restarted and could not recover under the load. In-cluster monitoring also depended on DNS, so the on-call engineer was paged late.
fix: The on-call engineer raised the memory limit and DNS recovered. The team moved to a node-local DNS cache, limited how far one application can affect cluster DNS, and added alerting from outside the clusters.
lesson: Cluster DNS is shared infrastructure that needs limits, caching and monitoring that does not depend on itself.

## Preply Kubernetes DNS and conntrack
company: Preply
year: 2020
area: Kubernetes
modules: kubernetes, networking, linux
source: Preply engineering post-mortem | https://medium.com/preply-engineering/dns-postmortem-e169efd45afd
what: On 28 February 2020 some services in a production cluster had a partial DNS failure for about 26 minutes and roughly 15,000 events were dropped.
cause: The autoscaler for the cluster DNS reduced the pods from three to two during low load. The node network proxy then failed to remove a stale connection tracking entry, so some traffic kept going to a pod that no longer existed. The team suspected a known conntrack issue but could not confirm it.
fix: On-call engineers noticed the rise in server errors from alerts and reverted a recent release, and the problem ended when a routine deploy rebuilt the table. The team disabled the DNS autoscaler, added a DNS cache and began to monitor the conntrack table.
lesson: Autoscaling a core component can create the failure it is meant to prevent; watch kernel level tables such as conntrack and be honest when a root cause is only suspected.

## Google Cloud network control plane descheduled
company: Google Cloud
year: 2019
area: Cloud networking
modules: cloud, networking, sre
source: Google Cloud incident report | https://status.cloud.google.com/incident/cloud-networking/19009
what: On 2 June 2019 network congestion caused packet loss and latency in six Google Cloud regions and affected services such as YouTube and G Suite for roughly four hours.
cause: A bug in maintenance automation let a single maintenance event deschedule the network control plane jobs in several independent locations at once. After a few minutes without a control plane, routes between locations were withdrawn and capacity dropped sharply. The congestion also disrupted the internal tools that engineers needed to diagnose it.
fix: Google halted the automation, rolled out a new configuration, rejected such requests in the cluster software and the control plane, and decided to persist control plane configuration so it does not have to be rebuilt after a loss.
lesson: Automation must refuse actions that cross failure domains, and the tools used to repair a network must not depend on that network.

## Google Cloud London cooling failure
company: Google Cloud
year: 2022
area: Cloud infrastructure
modules: cloud, sre, linux
source: Google Cloud incident report | https://status.cloud.google.com/incidents/fmEL9i2fArADKawkZAa2
what: During a record heatwave on 19 July 2022 Google Cloud lost capacity in one zone of its London region. Most services recovered after about 18 hours, and some instances needed about 35 hours.
cause: Several redundant cooling systems failed at the same time as extreme outside temperatures, so part of the zone was powered down to protect hardware. A routing change made during the response briefly isolated all three zones instead of one. About a third of the virtual machines and disks in the zone were affected, and some needed manual recovery.
fix: Cooling was repaired and services were restarted in a controlled order. Google committed to repair and retest zonal failover automation, reduce thermal load and audit cooling equipment.
lesson: Redundancy that shares a common environmental risk is not independent, and a response action can widen the incident; spread across zones and rehearse failover.

## Akamai edge DNS configuration bug
company: Akamai
year: 2021
area: Network and DNS
modules: networking, cicd, sre
source: Akamai statement | https://www.akamai.com/blog/news/akamai-summarizes-service-disruption-resolved
what: On 22 July 2021 many well known websites, including airlines, banks and gaming services, were unreachable for up to an hour.
cause: A software configuration update triggered a bug in a DNS component of Akamai's secure edge content delivery network. Akamai said it was not a cyberattack and later corrected its first statement, which had described a wider DNS impact than there was.
fix: Akamai rolled back the configuration update and began a review of its software update process.
lesson: Treat configuration as code with staged rollout and fast rollback, and keep a second DNS or delivery path for critical sites.

## GoCardless Postgres failover
company: GoCardless
year: 2017
area: Databases
modules: linux, sre, observability
source: GoCardless incident review | https://gocardless.com/blog/incident-review-api-and-dashboard-outage-on-10th-october/
what: On 10 October 2017 the API and dashboard of a payments company were down for 1 hour and 50 minutes.
cause: The primary Postgres node failed when a RAID array lost three disks. The cluster automation then failed to promote a replica because a cluster setting, a restricted virtual address and a crash of a Postgres process on the replica coincided. A recovery that should have taken one or two minutes took almost two hours.
fix: After about an hour of attempts, engineers promoted the synchronous replica by hand and repointed applications. The team planned fault injection exercises and a move away from virtual addresses and the cluster manager.
lesson: Automation fails under combined faults, so test failover with game days and keep manual recovery skills and runbooks current.

## Okta support system breach
company: Okta
year: 2023
area: Identity and security
modules: security, cloud
source: Okta root cause report | https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/
what: Between 28 September and 17 October 2023 an attacker downloaded files linked to 134 customers from Okta's support case system. Session tokens in some files were used to hijack sessions of five customers.
cause: A service account for the support system had its username and password saved in a personal browser profile on a company laptop. Customers had attached browser traffic files that contained session tokens. Different log events for two ways of viewing files meant the downloads were not detected for about two weeks.
fix: Okta disabled the account, revoked the tokens, blocked personal browser profiles on managed laptops, added detection rules and released token binding to the network location for administrators.
lesson: Service account credentials need strict storage rules, support uploads should have secrets removed, and monitoring has to cover every path to the same data.

## Uber storage key exposed in public code
company: Uber
year: 2014
area: Cloud security
modules: security, cloud, cicd
source: US Federal Trade Commission analysis | https://www.ftc.gov/system/files/documents/cases/1523054_uber_technologies_analysis.pdf
what: In May 2014 an intruder opened an Amazon S3 data store of Uber and read a file with details of drivers, including licence numbers. Uber found out in September 2014.
cause: An access key with full administrative rights had been posted publicly in a code-sharing site by an engineer. The FTC alleged that Uber used one shared key, did not limit access by job role, did not require multifactor authentication and stored sensitive data unencrypted.
fix: Uber took steps to stop the access and later agreed to a consent order that required a security programme and audits.
lesson: Never put keys in code, give each person and service a narrow role with temporary credentials, scan for leaked keys and encrypt sensitive data.

## npm event-stream backdoor
company: npm
year: 2018
area: Supply chain
modules: security, cicd
source: npm security team | https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident
what: A popular package, event-stream, was changed to depend on a malicious package that tried to steal wallet keys from one specific bitcoin application. It was found in November 2018.
cause: The original maintainer handed the package to someone who offered to help. On 9 September 2018 the new maintainer added the dependency flatmap-stream. Its code ran only when building one particular wallet app, so most users were not affected and the code went unnoticed for weeks.
fix: npm removed the malicious versions on 26 November, took over the package and published an analysis. The wallet vendor shipped a clean release.
lesson: Review who maintains the packages you depend on, pin and lock versions, run audits, and be careful with changes in ownership of small packages.

## Travis CI secrets exposed to pull requests
company: Travis CI
year: 2021
area: CI/CD security
modules: cicd, security
source: The Register report | https://www.theregister.com/2021/09/15/travis_ci_leak/
what: For at least a week in September 2021 a flaw let a pull request from a fork of a public project read the secret environment variables of the upstream project. The issue was reported on 7 September and fixed on 10 September.
cause: The build system made secrets available to builds started from forked pull requests. The vendor patched quietly and its bulletin gave little detail, which was criticised by affected developers.
fix: Maintainers had to rotate every secret that had been stored in the service. Travis CI later published a security bulletin that advised regular rotation.
lesson: Do not expose secrets to builds from untrusted forks, rotate secrets on any doubt, and expect to need a vendor's incident details to scope your own response.

## Tesla cloud account used for cryptomining
company: Tesla
year: 2018
area: Kubernetes security
modules: kubernetes, cloud, security
source: Trend Micro summary of the RedLock report | https://www.trendmicro.com/vinfo/gb/security/news/cybercrime-and-digital-threats/tesla-and-jenkins-servers-fall-victim-to-cryptominers
what: In early 2018 security researchers found that attackers were running cryptocurrency mining software in a cloud account of Tesla.
cause: A Kubernetes administration console was reachable from the internet without a password. In one of the pods the attackers found credentials for cloud storage. They kept the mining quiet by using an unlisted mining pool and limiting the CPU use.
fix: Tesla secured the console and said that no customer data had been exposed.
lesson: Never expose an administration interface without authentication, keep cloud credentials out of pods, and watch for unusual compute use and outbound traffic.

## Docker Hub unauthorized access
company: Docker
year: 2019
area: Registry security
modules: docker, security, cicd
source: The Hacker News report | https://thehackernews.com/2019/04/docker-hub-data-breach.html
what: In April 2019 Docker reported that an intruder had gained access to a Docker Hub database with the data of about 190,000 accounts.
cause: The access was to a single database. It held usernames, hashed passwords and tokens that linked automated builds to source hosting services.
fix: Docker asked affected users to change passwords, revoked the tokens for source hosting services and asked users to check their automated builds.
lesson: Registry accounts and automated build tokens are part of your supply chain; use access tokens with a narrow scope, turn on multifactor authentication and review your images after such an event.

## Maersk and NotPetya
company: Maersk
year: 2017
area: Ransomware and recovery
modules: security, sre, networking
source: iTnews report | https://www.itnews.com.au/news/maersk-had-to-reinstall-all-it-systems-after-notpetya-infection-481815
what: In June 2017 the NotPetya malware crippled the global shipping company A.P. Moller-Maersk. It had to reinstall about 4,000 servers, 45,000 PCs and 2,500 applications.
cause: The malware spread across the internal network by using stolen credentials and known flaws, and it wiped systems. All domain controllers were lost except one in Ghana, which had been offline because of a power cut and therefore held a clean copy.
fix: The company rebuilt its directory from that copy and then reinstalled the rest in about ten days, and later reviewed its security.
lesson: Flat networks turn one infection into a global outage, and offline, isolated copies of identity services decide how fast you can recover.

## TSB platform migration
company: TSB
year: 2018
area: Migration and releases
modules: sre, cicd
source: IT Pro summary of the Slaughter and May review | https://itpro.com/business-strategy/digital-transformation/354155/tsbs-it-disaster-pinned-on-big-bang-approach-to
what: In April 2018 TSB moved about five million customers to a new banking platform in one weekend. Customers lost access to accounts and services for days and fraud attempts rose sharply.
cause: An independent review found that the platform was not robustly tested, that oversight of suppliers was weak and that the board had not seriously considered a phased move. TSB also pointed to inconsistent configuration of two data centres that were meant to be identical.
fix: The bank changed its leadership and brought IT operations under its direct control, and regulators investigated.
lesson: Prefer small, reversible steps over a big cutover, test with real volume, and make a rollback plan a condition for go-live.

## Honeycomb Kafka metadata growth
company: Honeycomb
year: 2024
area: Observability and storage
modules: observability, linux, cloud
source: Honeycomb engineering blog | https://www.honeycomb.io/blog/bitten-by-a-kafka-bug-postmortem
what: In May 2024 engineers noticed that one Kafka broker read eight times more from disk than the other eight brokers and peaked above the rated limit of its device. There was no customer impact yet.
cause: After an upgrade, tiered storage metadata files had grown to hundreds of megabytes because the cleanup of metadata for segments deleted long ago was not enabled. One partition kept records of about six million deleted segments. Diagnosis needed kernel tracing because normal metrics did not show which files were read.
fix: The vendor's support identified the cleanup settings. Enabling them shrank the metadata by more than 99 percent and broker start-up in rolling upgrades fell from over 20 minutes to under one.
lesson: Revisit old settings as scale grows, look at per-device I/O and not only averages, and roll out clean-up of old data with care.

## Terraform state mix-up deletes production
company: DataTalks.Club
year: 2026
area: Infrastructure as code
modules: terraform, cloud, sre
source: Author's incident write-up | https://alexeyondata.substack.com/p/how-i-dropped-our-production-database
what: On 26 and 27 February 2026 a Terraform destroy removed the production network, database, cluster and load balancers of a course platform, together with its automated snapshots. The platform was down for about a day.
cause: The state file was local to an old laptop, so Terraform planned to create everything again. An older state file that pointed at production was later restored and used, two projects shared one configuration, and an AI coding agent was allowed to run plan, apply and destroy without review.
fix: After a support case, AWS found a snapshot that was not visible in the console and restored it. The author moved state to remote storage, turned on deletion protection, kept backups outside Terraform, added a daily restore test and now reviews every plan personally.
lesson: Keep state remote and locked, separate projects and accounts, protect databases from deletion, test restores, and never give an automated tool unreviewed permission to destroy.
