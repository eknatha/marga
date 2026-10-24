## Facebook BGP outage
company: Facebook
year: 2021
area: Network and DNS
modules: networking, cloud, sre
source: Meta engineering | https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/
what: In October 2021 Facebook, Instagram and WhatsApp were unreachable for about six hours. Even internal tools and badge access stopped working, which slowed recovery.
cause: A maintenance command to assess backbone capacity unintentionally disconnected the data centers from each other. A bug in the audit tool failed to stop it. DNS servers saw that they could not reach the data centers and withdrew their BGP routes, so the outside world could no longer find Facebook.
fix: Engineers gained physical access to the data centers to restore the backbone, and then brought services back gradually. Facebook reviewed its audit tooling and its recovery tools.
lesson: Your recovery path must not depend on the network you broke, and a safety check must itself be tested.

## Fastly global outage
company: Fastly
year: 2021
area: Deployment and release
modules: cloud, networking, sre
source: Fastly blog | https://www.fastly.com/blog/summary-of-june-8-outage
what: In June 2021 a large part of Fastly's content delivery network returned errors for under an hour, and well-known sites such as news and retail sites went offline.
cause: A software deployment weeks earlier contained a bug that was only triggered by a specific valid customer configuration. When a customer changed their settings, the bug caused errors across most of the network.
fix: Fastly detected the problem within a minute, disabled the configuration, and then fixed the bug and added more testing for such cases.
lesson: A latent bug can wait for the right input. Detect quickly, be able to roll back quickly, and keep customer configuration changes from taking down shared infrastructure.

## Roblox 73-hour outage
company: Roblox
year: 2021
area: Cloud outage
modules: cloud, observability, sre
source: Roblox blog | https://corp.roblox.com/newsroom/2021/10/roblox-return-to-service-10-28-10-31-2021
what: In late October 2021 Roblox was unavailable for around three days, affecting millions of players.
cause: The Consul service discovery cluster degraded under heavy load after a new streaming feature was enabled and a storage performance issue in the underlying database. Roblox's monitoring also depended on Consul, so engineers could not see well.
fix: Roblox removed the streaming feature, rebuilt the Consul cluster on different settings, and split its services into more clusters to limit the blast radius.
lesson: Understand the load profile of shared infrastructure, and keep observability independent of the systems it observes.

## Atlassian site deletion
company: Atlassian
year: 2022
area: Human error
modules: cloud, sre, bash
source: Atlassian post-incident review | https://www.atlassian.com/engineering/post-incident-review-april-2022-outage
what: In April 2022 Atlassian accidentally deleted the cloud sites of around 400 customers. Some customers were without service for up to two weeks.
cause: A maintenance script was given the wrong list of identifiers, and it used a permanent deletion method instead of marking items for deletion. Restoring individual sites was a manual process that had never been done at that scale.
fix: Atlassian rebuilt the data from backups, automated restoration for multiple sites, and changed deletion to be reversible with checks on the inputs.
lesson: Make deletion reversible, validate script input, and practise restoring at scale before you need to.

## Knight Capital deployment
company: Knight Capital Group
year: 2012
area: Deployment and release
modules: cicd, sre
source: SEC administrative order | https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf
what: On 1 August 2012 a trading firm lost about 440 million dollars in roughly 45 minutes when its systems sent a flood of unintended orders.
cause: A new feature was deployed by hand to eight servers, but one server was missed. A flag reused from older code activated unused code on that server. There was no kill switch, and alerts were not acted on.
fix: The firm was rescued by investors and later acquired. Regulators required stronger controls over software releases and risk limits.
lesson: Automate and verify deployments, remove dead code, and give operators a fast way to stop the system.

## CrowdStrike content update
company: CrowdStrike
year: 2024
area: Deployment and release
modules: cicd, linux, sre
source: CrowdStrike root cause analysis | https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf
what: On 19 July 2024 a security update caused millions of Windows computers to crash and fail to restart. Airlines, hospitals and banks were disrupted worldwide.
cause: A content update defined a template with more input fields than the sensor code expected. The mismatch caused an out-of-bounds memory read in a kernel driver. The update went to all customers at once, and validation did not catch the mismatch.
fix: CrowdStrike pulled the update and published manual repair steps. It added staged rollouts, more testing of content, and customer control over when updates are applied.
lesson: Roll out every change, including data and content, in stages, and watch for early crashes before widening the release.

## Reddit Pi Day outage
company: Reddit
year: 2023
area: Kubernetes
modules: kubernetes, networking, sre
source: Reddit engineering | https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/
what: On 14 March 2023 Reddit was down or degraded for several hours after an upgrade of a Kubernetes cluster.
cause: The upgrade changed how nodes are labelled. The network layer's route reflectors were selected by a node label that no longer matched, so routes were lost and Pods lost their network connectivity. The rollback was hard because the upgrade was not simple to reverse.
fix: Engineers restored the route reflector configuration and the cluster networking, and then added safer upgrade procedures and testing of upgrades in a copy of production.
lesson: Read upgrade notes for removed or renamed labels, and rehearse upgrades and rollbacks on a realistic cluster.

## Datadog multi-region outage
company: Datadog
year: 2023
area: Kubernetes
modules: kubernetes, linux, observability, sre
source: Datadog blog | https://www.datadoghq.com/blog/2023-03-08-multiregion-infrastructure-connectivity-issue/
what: In March 2023 Datadog's platform was largely unavailable in several regions and clouds at the same time, for many hours.
cause: An automatic operating system security update ran on many machines around the same time. It restarted a system networking service, which removed network settings and left nodes unable to talk to each other. Because the same pattern existed everywhere, regions failed together.
fix: Datadog changed how operating system updates are applied so that they roll out in stages, and reviewed how its nodes are rebuilt and recovered.
lesson: Automatic updates are a deployment. Stagger them, and do not let all regions share one trigger.

## Stack Overflow regex outage
company: Stack Overflow
year: 2016
area: Deployment and release
modules: python, cicd, sre
source: Stack Overflow outage postmortem | https://stackstatus.tumblr.com/post/147710624694/outage-postmortem-july-20-2016
what: In July 2016 Stack Overflow was unavailable for about half an hour. All web servers were at full CPU use.
cause: A user posted a question with a huge amount of whitespace. A regular expression used to trim whitespace took exponential time on that input, and the same post was requested by every server.
fix: The team removed the post and replaced the regex with a plain string operation.
lesson: Use safe string functions where you can, set time limits on regexes, and test with hostile input.

## Instapaper database file size limit
company: Instapaper
year: 2017
area: Database
modules: linux, cloud, sre
source: Instapaper blog | https://medium.com/making-instapaper/instapaper-outage-cause-recovery-3c32a7e9cc5f
what: In February 2017 Instapaper was unavailable for more than a day. Users could not read saved articles.
cause: The main database reached the maximum file size of its file system, which was about 2 TB on the ext3 file system the instances were using. Writes then failed and could not be fixed in place.
fix: The team built a new database on a modern file system, restored data from backups and replicas, and moved to a managed service.
lesson: Know the hard limits of your file system and database, alert on them, and rehearse how to rebuild.

## UniSuper cloud subscription deletion
company: UniSuper
year: 2024
area: Database
modules: cloud, terraform, sre
source: UniSuper and Google Cloud joint statement | https://www.unisuper.com.au/about-us/media-centre/2024/a-joint-statement-from-unisuper-and-google-cloud
what: In May 2024 a pension fund lost its cloud environment for about two weeks after the provider deleted its private cloud subscription. Members could not access their accounts.
cause: A one-off misconfiguration during provisioning caused the deletion. The deletion also removed backups held in the same region. The fund had backups with another provider, which allowed recovery.
fix: Google investigated, fixed the issue and put checks in place to prevent a repeat. UniSuper restored from its independent backups.
lesson: Keep backups under a separate account or provider, and test restoring from them.

## Exchange Y2022 date bug
company: Microsoft
year: 2022
area: Time and dates
modules: python, cloud, sre
source: Microsoft Exchange team blog | https://techcommunity.microsoft.com/
what: At midnight on 1 January 2022 on-premises Exchange servers stopped delivering email. Messages piled up in queues.
cause: A malware scanning component stored the date as a number such as 2201010001. That value is larger than the biggest signed 32-bit integer, so the scanner failed.
fix: Microsoft published a manual workaround and then an update that changed how versions are stored.
lesson: Dates stored as numbers are fragile. Use real date types and test across year boundaries.

## Docker Hub pull rate limits
company: Docker
year: 2020
area: Containers
modules: docker, cicd, kubernetes
source: Docker rate limits | https://www.docker.com/increase-rate-limits/
what: In November 2020 Docker introduced pull limits for anonymous and free accounts. CI pipelines and clusters that pulled images from Docker Hub began to fail with too-many-requests errors.
cause: Many builds pulled base images straight from a public registry, often from shared addresses that count together, and had no cache or login.
fix: Teams logged in, set up pull-through caches and mirrors, and copied the images they needed into their own registries.
lesson: Do not make your pipeline depend directly on a public service. Mirror what you need into a registry you control.

## ingress-nginx IngressNightmare
company: Kubernetes community
year: 2025
area: Kubernetes
modules: kubernetes, docker, cicd
source: Kubernetes blog | https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/
what: In March 2025 a serious flaw was published in the ingress-nginx controller, a very widely used component in Kubernetes clusters. An attacker who could reach the admission controller might run code in it.
cause: The admission controller built NGINX configuration from Ingress objects and could be tricked into including attacker-supplied settings. It also had wide access to Secrets in the cluster.
fix: The project released fixed versions. Operators were told to upgrade, restrict network access to the admission webhook, or disable it.
lesson: Components with broad cluster permissions are high-value targets. Limit their network exposure and keep them patched.

## HashiCorp licence change
company: HashiCorp
year: 2023
area: Vendor risk
modules: terraform, cicd, cloud
source: HashiCorp announcement | https://www.hashicorp.com/blog/hashicorp-adopts-business-source-license
what: In August 2023 HashiCorp changed the licence of Terraform and other products from an open source licence to a source-available one. The community then created OpenTofu, a fork hosted by the Linux Foundation.
cause: A business decision about how others could use the code commercially. Teams and vendors had built workflows on the assumption that the licence would stay the same.
fix: Organisations reviewed the terms against their use, and many tested or moved to OpenTofu or stayed on existing versions.
lesson: Track the licence and the roadmap of tools you build on, and keep your configuration portable where you can.

## Optus network outage
company: Optus
year: 2023
area: Network and DNS
modules: networking, cloud, sre
source: Optus statement | https://www.optus.com.au/about/media-centre
what: In November 2023 millions of Optus customers in Australia lost mobile and internet service for about half a day, including access to emergency calls from some phones.
cause: After a routine software upgrade at one of its international peering connections, routers received an unusually large amount of routing information. They hit a pre-set safety limit and shut down parts of the core network.
fix: Optus restarted the network and has changed how upgrades are tested and how limits are set, and how emergency calls are handled during an outage.
lesson: Know the limits of your routers, test upgrades with realistic data, and plan how critical services work during an outage.

## Rogers network outage
company: Rogers Communications
year: 2022
area: Network and DNS
modules: networking, sre
source: Rogers report to the regulator | https://crtc.gc.ca/
what: In July 2022 mobile and internet service failed for millions of Rogers customers in Canada for around a day. Some emergency calling was affected.
cause: A maintenance change to the core network removed a filter on distribution routers. The routers then accepted far more routes than they could handle and the core network lost the ability to carry traffic. Management tools relied on the same core.
fix: Rogers rebuilt service step by step, separated its management network, and committed to staged changes and better testing.
lesson: Out-of-band access matters. If the tool you use to repair the network needs the network, you are stuck.

## Verizon route leak
company: Cloudflare
year: 2019
area: Network and DNS
modules: networking, cloud, sre
source: Cloudflare blog | https://blog.cloudflare.com/how-verizon-and-a-bgp-optimizer-lead-to-a-big-route-leak/
what: In June 2019 a large part of internet traffic, including traffic to Cloudflare and Amazon, was routed through a small network and dropped. Services were hard to reach for about two hours.
cause: A small ISP using a BGP optimizer leaked more specific routes to a large provider, which accepted and passed them on without filtering.
fix: The routes were withdrawn. The case drove adoption of RPKI route validation and stricter filtering on the part of network operators.
lesson: Filter what you accept from peers and customers, and sign your routes so others can check them.

## YouTube BGP hijack
company: Pakistan Telecom
year: 2008
area: Network and DNS
modules: networking, sre
source: RIPE NCC case study | https://www.ripe.net/publications/news/industry-developments/youtube-hijacking-a-ripe-ncc-ripestat-case-study
what: In February 2008 YouTube was unreachable for most of the world for about two hours.
cause: Pakistan Telecom announced a more specific route for YouTube's address range to block the site inside Pakistan. The announcement leaked to its upstream provider and spread globally, so traffic went to Pakistan instead.
fix: The announcement was withdrawn and YouTube announced even more specific routes to take traffic back.
lesson: Routing trust was once informal. Use filters and route validation, and have a plan for announcing more specific routes yourself.

## Microsoft Teams expired certificate
company: Microsoft
year: 2020
area: Certificates
modules: networking, cloud, sre
source: Microsoft 365 status history | https://status.office365.com/
what: In February 2020 Microsoft Teams was unavailable for several hours because users could not sign in.
cause: An authentication certificate expired and had not been renewed. Services that needed it failed.
fix: Microsoft renewed the certificate and added more alerting and tracking for certificate expiry.
lesson: Inventory every certificate, alert well before expiry, and automate renewal.

## Let's Encrypt DST root expiry
company: Let's Encrypt
year: 2021
area: Certificates
modules: networking, linux, sre
source: Let's Encrypt documentation | https://letsencrypt.org/docs/dst-root-ca-x3-expiration-september-2021/
what: On 30 September 2021 an old root certificate expired. Some devices and applications, such as older Android phones and older versions of OpenSSL, stopped trusting sites that used Let's Encrypt.
cause: Clients had not received the newer root certificate, or had software that did not handle the chain correctly. Some programs did not use the operating system trust store.
fix: Site owners were advised to update software and trust stores. Some customers served a different chain for older clients.
lesson: Keep clients and trust stores up to date, test with old clients you still support, and know where each application gets its trust anchors.

## O2 and Ericsson expired certificate
company: Ericsson
year: 2018
area: Certificates
modules: networking, cloud, sre
source: Ericsson newsroom | https://www.ericsson.com/en/newsroom
what: In December 2018 mobile data stopped for tens of millions of customers of several operators, including O2 in the UK and SoftBank in Japan, for most of a day.
cause: An expired certificate in a core network software component caused it to stop working. The same software was in use in multiple countries, so the fault appeared everywhere at once.
fix: Ericsson replaced the certificate, restarted the affected nodes, and apologised to operators. Operators added checks of certificate validity in their networks.
lesson: Expiry dates in embedded software are easy to forget. Track them like any other deadline and test certificate renewal.
