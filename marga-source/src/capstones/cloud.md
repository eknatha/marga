## Host a static site with a CDN and TLS
level: Beginner
hours: 3
modules: cloud, networking
summary: Serve a static website from object storage behind a CDN with a certificate, a custom domain and a cache rule.
goal: Publish a fast, cheap, secure site with no servers to patch.
build: A private storage bucket, a CDN distribution with origin access control, a TLS certificate, a DNS record and cache headers.
steps:
- Create a bucket with public access blocked and upload a small site.
- Create a CDN distribution that reads the bucket through an origin access identity or control, not a public bucket policy.
- Request a certificate for your domain and validate it through DNS.
- Add a DNS alias record that points the domain to the CDN.
- Set cache headers: long lifetime for hashed assets, short for the HTML page.
- Force HTTPS, add security headers, and test with `curl -I` and a certificate check with `openssl s_client`.
- Upload a changed page, invalidate only the changed path, and measure the cache hit and miss headers.
check:
- The bucket is not reachable directly, only through the CDN.
- The site loads over HTTPS with a valid certificate.
- Hashed assets are served from cache on the second request.
- You can explain why a DNS TTL matters when you change the record.
stretch: Add a custom error page and a redirect from the bare domain to `www`.

## Build a private network with a public front door
level: Intermediate
hours: 4
modules: cloud, networking, terraform
summary: Design a network with public and private subnets, a NAT path, least-privilege rules and flow logs.
goal: Put each tier in the right place and prove only the intended traffic can flow.
build: A virtual network across two zones, public and private subnets, an internet gateway, a NAT gateway, security groups by role, a bastion-free admin path and flow logs.
steps:
- Draw the network first: address range, two zones, public subnets for the load balancer, private subnets for apps and data.
- Create it with Terraform so it can be rebuilt, using variables for ranges and names.
- Add an internet gateway for public subnets and a NAT gateway so private hosts can reach package repositories outbound.
- Create three security groups (load balancer, app, database) where each allows only the previous tier as source.
- Use a session-based admin path (such as a managed session service) instead of opening SSH to the internet.
- Enable flow logs, then try a forbidden connection and find the `REJECT` record.
- Break the route to the NAT gateway on purpose, observe the timeout from a private host, and fix it from the route table.
check:
- The database accepts connections only from the app tier.
- Private hosts reach the internet outbound but are not reachable inbound.
- Nothing listens on port 22 to the whole internet.
- You can find a blocked connection in the flow logs.
stretch: Add a private endpoint to the storage service so that traffic stays off the internet.

## Build a serverless API with least-privilege access
level: Intermediate
hours: 4
modules: cloud, python
summary: Create an API backed by functions, a queue and a table, each with its own narrow permissions.
goal: Build an event-driven service where no component has more access than it needs.
build: An HTTP API, two functions (accept and process), a queue with a dead-letter queue, a database table and one role per function.
steps:
- Create a table for orders with a partition key and write a function that stores an order.
- Put a queue between accept and process, and add a dead-letter queue after three failed attempts.
- Write the accept function: validate input, put a message on the queue, return an id quickly.
- Write the process function: read from the queue, write to the table, and make it safe to run twice for the same message.
- Create one role per function that allows only the actions and resources it uses, and test a denied action with a policy simulator.
- Send a poison message, confirm it lands in the dead-letter queue, and write down how you would replay it.
- Add structured logs with a request id and one alarm on the dead-letter queue depth.
check:
- Each function role lists specific actions and resources, with no wildcard on everything.
- Processing the same message twice does not create two orders.
- A bad message ends up in the dead-letter queue and raises an alarm.
- You can trace one request from API to table using its id.
stretch: Add a throttle and a retry with backoff and jitter on the caller.

## Add cost and recovery guardrails
level: Advanced
hours: 4
modules: cloud, terraform
summary: Make an account safe to leave running with tags, budgets, automated backups and a tested restore.
goal: Know what things cost, who owns them, and that you can recover them.
build: A tagging standard enforced by code, budgets with alerts, scheduled backups, a cross-region copy and a timed restore drill.
steps:
- Define required tags (owner, environment, cost centre) and apply them through a provider-level default in Terraform.
- Create a budget with alerts at 50, 80 and 100 percent of the expected monthly spend.
- Find unattached disks, idle load balancers and old snapshots with a short script and list their monthly cost.
- Schedule daily backups of a database or volume with a retention policy, and copy them to a second region.
- Restore a backup into a new resource, check the data, and record how long the restore took.
- Compare the measured restore time with the recovery time you promised, and write down the gap.
- Add a rule that new untagged resources are reported each week.
check:
- Every resource in the project carries the required tags.
- A budget alert reaches a real person.
- You have restored from a backup at least once and timed it.
- You can state your recovery time and recovery point, and show evidence.
stretch: Replace one always-on instance with a scheduled start and stop, and calculate the saving.
