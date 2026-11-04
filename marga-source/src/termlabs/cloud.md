## Upload fails with Access Denied
id: cl-aws-wrong-profile
module: cloud
level: Beginner
minutes: 10
lesson: cloud/identity-and-access
engine: Simulated AWS command line and account
summary: An upload to the reports bucket is refused because the shell is using the wrong AWS profile. Find out who you are and use the right profile.
vary: [{"shop-reports": "shop-exports", "report.csv": "totals.csv"}, {"shop-reports": "shop-ledgers", "report.csv": "daily.csv"}]
@@ story
You are copying the nightly report to the shop-reports bucket. The command fails with Access Denied, yet your teammate ran the same command an hour ago and it worked. Nothing is wrong with the bucket. Something is wrong with who you are when you run the command.
@@ goals
- Find out which identity the command line is using.
- Upload report.csv to the shop-reports bucket with the profile that is allowed to write.
- Leave the bucket settings alone.
@@ hints
- `aws sts get-caller-identity` prints the identity in use. Compare it with the profile names you have.
- The profile named reader can list but not write. The profile named deployer can write to shop-reports.
- Add `--profile deployer` to one command, or run `export AWS_PROFILE=deployer` to change it for the whole shell.
- `aws s3 cp report.csv s3://shop-reports/` does the upload.
@@ file /home/user/report.csv
month,total
11,5200

@@ world
{"cloud": {"aws": {"profile": "reader", "profiles": {"reader": {"user": "report-reader", "allow": ["s3:ListBucket", "s3:ListAllMyBuckets", "s3:GetObject", "sts:*"]}, "deployer": {"user": "report-deployer", "allow": ["s3:*", "sts:*"]}}, "buckets": {"shop-reports": {"objects": {"2026-10.csv": "month,total\n10,4000\n"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-reports/",
  "code": 0,
  "label": "report.csv is in the bucket",
  "out": "report\\.csv"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-reports/",
  "code": 0,
  "label": "last month's report is still there",
  "out": "2026-10\\.csv"
 }
]
@@ explain
Every aws command runs as one identity, chosen by the --profile option, the AWS_PROFILE variable or the default profile, in that order. Access Denied usually means the identity lacks permission, so the first question is who you are, not what the bucket allows. Checking with sts get-caller-identity takes one second and saves a long hunt through bucket policies.
@@ solution
aws sts get-caller-identity
aws s3 cp report.csv s3://shop-reports/ --profile deployer


## A bucket is open to the world
id: cl-aws-public-bucket
module: cloud
level: Beginner
minutes: 12
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated AWS command line and account
summary: A customer-exports bucket is readable by anyone. Close it with the ACL and the public access block, and keep the data.
vary: [{"customer-exports": "client-archives"}, {"customer-exports": "partner-feeds"}]
@@ story
A security scan says the bucket customer-exports is public. It holds files that must never be readable without a login. The team still needs the files, so deleting the bucket is not an answer.
@@ goals
- Confirm that the bucket is public.
- Make the bucket private.
- Turn on all four public access block settings.
- Keep every file in the bucket.
@@ hints
- `aws s3api get-bucket-policy-status --bucket customer-exports` says whether it is public.
- `aws s3api get-bucket-acl --bucket customer-exports` shows an AllUsers grant. `put-bucket-acl --acl private` removes it.
- The public access block is a second lock that stays closed even if someone later sets a public ACL: `aws s3api put-public-access-block --bucket customer-exports --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`.
@@ world
{"cloud": {"aws": {"buckets": {"customer-exports": {"acl": "public-read", "objects": {"export-1.csv": "id,name\n1,Asha\n", "export-2.csv": "id,name\n2,Ravi\n"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3api get-bucket-policy-status --bucket customer-exports --query \"PolicyStatus.IsPublic\" --output text",
  "code": 0,
  "label": "the bucket is no longer public",
  "out": "False"
 },
 {
  "t": "cmd",
  "run": "aws s3api get-public-access-block --bucket customer-exports --query \"PublicAccessBlockConfiguration.[BlockPublicAcls,IgnorePublicAcls,BlockPublicPolicy,RestrictPublicBuckets]\" --output text",
  "code": 0,
  "label": "all four blocks are on",
  "out": "^True\\tTrue\\tTrue\\tTrue"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://customer-exports/",
  "code": 0,
  "label": "both exports are still there",
  "out": "export-2\\.csv"
 }
]
@@ explain
Two controls decide whether a bucket is public: who the ACL or policy names, and the public access block that overrides them. Fixing only the ACL leaves the door unlocked for the next mistake. Setting all four block options closes the whole class of problem, and it never touches the data.
@@ solution
aws s3api put-bucket-acl --bucket customer-exports --acl private
aws s3api put-public-access-block --bucket customer-exports --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true


## The web server will not answer
id: cl-aws-stopped-instance
module: cloud
level: Beginner
minutes: 8
lesson: cloud/compute-and-storage
engine: Simulated AWS command line and account
summary: Nothing answers on the web server. Check the instance state and start it.
vary: [{"i-0aa1": "i-0ab7", "web-1": "api-1"}, {"i-0aa1": "i-0ac9", "web-1": "shop-1"}]
@@ story
The shop site is down. The load balancer says the only target is unhealthy. Before you look at logs, check whether the machine is even running.
@@ goals
- Find the instance named web-1.
- Start it and confirm that it is running.
@@ hints
- `aws ec2 describe-instances` lists instances. Add `--query` to keep the output short.
- Look at State.Name. A stopped instance does not serve traffic and costs no compute.
- `aws ec2 start-instances --instance-ids i-0aa1` starts it.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0aa1", "type": "t3.small", "state": "stopped", "tags": {"Name": "web-1", "owner": "shop"}, "sgs": ["sg-web"]}, {"id": "i-0bb2", "type": "t3.small", "state": "running", "tags": {"Name": "db-1", "owner": "shop"}, "sgs": ["sg-web"]}], "sgs": [{"id": "sg-web", "name": "web", "ingress": []}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0aa1 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "web-1 is running",
  "out": "running"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0bb2 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "db-1 is untouched",
  "out": "running"
 }
]
@@ explain
The first check in a cloud outage is the cheapest one: is the thing on. Instance state, then the security group, then the operating system. Starting the instance is safe here because it was stopped, not terminated. A terminated instance cannot be started again.
@@ solution
aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,State.Name]' --output text
aws ec2 start-instances --instance-ids i-0aa1


## SSH times out from the office
id: cl-aws-ssh-blocked
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/virtual-networks
engine: Simulated AWS command line and account
summary: The bastion host runs, but SSH from the office never connects. Open port 22 to the office address only.
vary: [{"203.0.113.7": "198.51.100.23", "i-0cc3": "i-0cd4"}, {"203.0.113.7": "192.0.2.45", "i-0cc3": "i-0ce5"}]
@@ story
The bastion instance is running, but ssh from the office times out. A timeout (not a refusal) points at a firewall dropping packets. The office has the fixed address 203.0.113.7. Opening port 22 to the whole internet would pass a quick test and fail every audit.
@@ goals
- Find the security group on the bastion.
- Allow TCP port 22 from 203.0.113.7/32 only.
- Do not open port 22 to 0.0.0.0/0.
@@ hints
- `aws ec2 describe-instances --instance-ids i-0cc3` shows the security group id.
- `aws ec2 describe-security-groups --group-ids sg-bastion` shows what is allowed in. Port 22 is missing.
- `aws ec2 authorize-security-group-ingress --group-id sg-bastion --protocol tcp --port 22 --cidr 203.0.113.7/32` adds the rule.
- A /32 means exactly one address.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0cc3", "type": "t3.micro", "state": "running", "tags": {"Name": "bastion"}, "sgs": ["sg-bastion"]}], "sgs": [{"id": "sg-bastion", "name": "bastion", "ingress": [{"proto": "tcp", "from": 443, "to": 443, "cidr": "10.0.0.0/16"}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-bastion --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "port 22 is open to the office address",
  "out": "203\\.0\\.113\\.7/32"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-bastion",
  "code": 0,
  "label": "port 22 is not open to everyone",
  "notOut": "0\\.0\\.0\\.0/0"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-bastion",
  "code": 0,
  "label": "the existing 443 rule is kept",
  "out": "443"
 }
]
@@ explain
A security group is a list of allowed traffic. A connection that hangs is almost always a missing allow rule, while a connection that is refused means something answered and said no. The narrowest rule that works is a single address with /32. Wider rules are easy to add and hard to take back.
@@ solution
aws ec2 authorize-security-group-ingress --group-id sg-bastion --protocol tcp --port 22 --cidr 203.0.113.7/32


## The app role cannot read its config bucket
id: cl-aws-role-missing-policy
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/identity-and-access
engine: Simulated AWS command line and account
summary: The app-role gets Access Denied when reading config. Attach the existing read-only policy, not an admin policy.
@@ story
The service runs with the role app-role. It cannot read the settings bucket. Someone suggests attaching AdministratorAccess to make the error go away. That would work and would be wrong. A read-only policy for that bucket already exists.
@@ goals
- List the policies attached to app-role.
- Attach the policy that allows reading the config bucket.
- Do not attach AdministratorAccess.
@@ hints
- `aws iam list-attached-role-policies --role-name app-role` shows what it has.
- The policy ARNs are in the account. Find the one named for read access to config.
- `aws iam attach-role-policy --role-name app-role --policy-arn arn:aws:iam::123456789012:policy/ConfigBucketRead`
- Check the result with the list command again.
@@ world
{"cloud": {"aws": {"roles": {"app-role": {"policies": ["arn:aws:iam::123456789012:policy/LogsWrite"]}}, "policies": {"arn:aws:iam::123456789012:policy/LogsWrite": {"name": "LogsWrite"}, "arn:aws:iam::123456789012:policy/ConfigBucketRead": {"name": "ConfigBucketRead"}, "arn:aws:iam::aws:policy/AdministratorAccess": {"name": "AdministratorAccess"}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws iam list-attached-role-policies --role-name app-role --query \"AttachedPolicies[].PolicyName\" --output text",
  "code": 0,
  "label": "ConfigBucketRead is attached",
  "out": "ConfigBucketRead"
 },
 {
  "t": "cmd",
  "run": "aws iam list-attached-role-policies --role-name app-role --query \"AttachedPolicies[].PolicyName\" --output text",
  "code": 0,
  "label": "AdministratorAccess is not attached",
  "notOut": "AdministratorAccess"
 },
 {
  "t": "cmd",
  "run": "aws iam list-attached-role-policies --role-name app-role --query \"AttachedPolicies[].PolicyName\" --output text",
  "code": 0,
  "label": "LogsWrite is kept",
  "out": "LogsWrite"
 }
]
@@ explain
Least privilege means a role gets the smallest set of permissions that lets it work. When access is denied, find the missing permission and add it narrowly. Reaching for an admin policy fixes the symptom and leaves the account one stolen key away from a breach.
@@ solution
aws iam list-attached-role-policies --role-name app-role
aws iam attach-role-policy --role-name app-role --policy-arn arn:aws:iam::123456789012:policy/ConfigBucketRead


## Turn on versioning before it is needed
id: cl-aws-versioning
module: cloud
level: Intermediate
minutes: 10
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated AWS command line and account
summary: The invoices bucket has no versioning, so an overwrite is permanent. Turn versioning on.
@@ story
Last week a script overwrote an invoice and nobody could get the old one back. The bucket invoices has no versioning. Turn it on, check it, and make sure the existing files stay.
@@ goals
- Check the versioning state of the bucket.
- Enable versioning.
- Keep the existing files.
@@ hints
- `aws s3api get-bucket-versioning --bucket invoices` prints nothing when versioning has never been turned on.
- `aws s3api put-bucket-versioning --bucket invoices --versioning-configuration Status=Enabled`
- Run the get command again to confirm the status.
@@ world
{"cloud": {"aws": {"buckets": {"invoices": {"objects": {"inv-001.pdf": "pdf-1", "inv-002.pdf": "pdf-2"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3api get-bucket-versioning --bucket invoices --query \"Status\" --output text",
  "code": 0,
  "label": "versioning is enabled",
  "out": "Enabled"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://invoices/",
  "code": 0,
  "label": "invoices are still there",
  "out": "inv-002\\.pdf"
 }
]
@@ explain
With versioning on, an overwrite or delete keeps the earlier version, so a mistake becomes a restore instead of a loss. It must be enabled before the mistake, not after. Versions cost storage, so pair it with a lifecycle rule that expires old ones.
@@ solution
aws s3api put-bucket-versioning --bucket invoices --versioning-configuration Status=Enabled


## Find the disks nobody uses
id: cl-aws-orphan-volumes
module: cloud
level: Intermediate
minutes: 15
lesson: cloud/managed-services-and-cost
engine: Simulated AWS command line and account
summary: Unattached volumes keep costing money. Delete the ones that belong to no server, and keep every attached one.
@@ story
The monthly bill shows storage for disks that are not attached to any instance. These are left over from servers that were deleted. Remove only the volumes that are available (not in use). A volume that is attached must not be touched.
@@ goals
- List volumes and find the ones with state available.
- Delete the unattached volumes.
- Keep all attached volumes.
@@ hints
- `aws ec2 describe-volumes --filters Name=status,Values=available` lists unattached volumes.
- `aws ec2 describe-volumes --query 'Volumes[].[VolumeId,State,Size]' --output text` shows all of them.
- `aws ec2 delete-volume --volume-id vol-0d01` removes one. AWS refuses to delete an attached one.
- Delete only the volumes in the available state.
@@ world
{"cloud": {"aws": {"volumes": [{"id": "vol-0a01", "size": 50, "attachedTo": "i-0aa1"}, {"id": "vol-0d01", "size": 100}, {"id": "vol-0d02", "size": 200}, {"id": "vol-0a02", "size": 20, "attachedTo": "i-0bb2"}], "instances": [{"id": "i-0aa1", "state": "running", "tags": {"Name": "web-1"}}, {"id": "i-0bb2", "state": "running", "tags": {"Name": "db-1"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-volumes --filters Name=status,Values=available --query \"Volumes[].VolumeId\" --output text",
  "code": 0,
  "label": "no unattached volume is left",
  "notOut": "vol-0d0"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-volumes --query \"Volumes[].VolumeId\" --output text",
  "code": 0,
  "label": "both attached volumes remain",
  "out": "vol-0a01\\s+vol-0a02|vol-0a02\\s+vol-0a01"
 }
]
@@ explain
Cost clean-up is a safe habit when it starts with a read. List by state, look at what each item is, and only then delete. Deleting a volume cannot be undone, so real teams snapshot first. The cloud refuses to delete an attached volume, which is a useful guard, but not one to lean on.
@@ solution
aws ec2 describe-volumes --filters Name=status,Values=available
aws ec2 delete-volume --volume-id vol-0d01
aws ec2 delete-volume --volume-id vol-0d02


## Tag every server with an owner
id: cl-aws-missing-tags
module: cloud
level: Advanced
minutes: 15
lesson: cloud/security-and-governance
engine: Simulated AWS command line and account
summary: Cost reports need an owner tag on every instance. Find the untagged ones and tag them.
@@ story
Finance cannot charge servers to teams because some have no owner tag. The untagged servers belong to the platform team. Tag them with owner=platform. Servers that already have an owner must keep theirs.
@@ goals
- Find the instances without an owner tag.
- Add owner=platform to each of them.
- Do not change the owner of tagged servers.
@@ hints
- `aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,Tags]' --output json` shows tags per instance.
- An instance with no owner key in Tags is untagged.
- `aws ec2 create-tags --resources i-0e01 i-0e03 --tags Key=owner,Value=platform` can tag several at once.
- Check afterwards with a filter: `--filters Name=tag:owner,Values=platform`.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0e01", "state": "running", "tags": {"Name": "batch-1"}}, {"id": "i-0e02", "state": "running", "tags": {"Name": "shop-1", "owner": "shop"}}, {"id": "i-0e03", "state": "stopped", "tags": {"Name": "old-ci"}}, {"id": "i-0e04", "state": "running", "tags": {"Name": "pay-1", "owner": "payments"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --filters Name=tag:owner,Values=platform --query \"Reservations[].Instances[].InstanceId\" --output text",
  "code": 0,
  "label": "the two untagged servers are tagged platform",
  "out": "i-0e01.*i-0e03|i-0e03.*i-0e01"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0e02 --query \"Reservations[].Instances[].Tags[?Key=='owner'].Value[]\" --output text",
  "code": 0,
  "label": "the shop owner tag is unchanged",
  "out": "^shop"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0e04 --query \"Reservations[].Instances[].Tags[?Key=='owner'].Value[]\" --output text",
  "code": 0,
  "label": "the payments owner tag is unchanged",
  "out": "^payments"
 }
]
@@ explain
Tags are how a cloud account answers who owns this and who pays for it. A missing tag is invisible until the bill arrives. Apply them in bulk with one command, check by filtering on the tag, and then enforce them at creation time with a policy so the gap does not return.
@@ solution
aws ec2 create-tags --resources i-0e01 i-0e03 --tags Key=owner,Value=platform


## Terminate a server that refuses to die
id: cl-aws-protected-instance
module: cloud
level: Advanced
minutes: 10
lesson: cloud/security-and-governance
engine: Simulated AWS command line and account
summary: A decommissioned instance cannot be terminated. Understand the guard that stops it, and terminate the right server only.
@@ story
Two servers are tagged decommission=true. Termination of one of them is refused. In this simulator the command line cannot change the protection, so the lesson is to read the error and not to work around it. Terminate the one that can be terminated, and leave the protected one alone.
@@ goals
- List the instances tagged decommission=true.
- Terminate the one that is allowed.
- Leave the protected instance running and untouched.
@@ hints
- `aws ec2 describe-instances --filters Name=tag:decommission,Values=true` finds both.
- Try to terminate each one. One command succeeds and one is refused with OperationNotPermitted.
- The refusal is a guard against exactly this mistake. Read it and stop. Do not look for a way around it.
- Terminate only i-0f02.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0f01", "state": "running", "protect": true, "tags": {"Name": "db-legacy", "decommission": "true"}}, {"id": "i-0f02", "state": "running", "tags": {"Name": "web-legacy", "decommission": "true"}}, {"id": "i-0f03", "state": "running", "tags": {"Name": "web-new"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0f02 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "web-legacy is terminated",
  "out": "terminated"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0f01 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "the protected server is untouched",
  "out": "running"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0f03 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "the new web server is untouched",
  "out": "running"
 }
]
@@ explain
Termination protection exists because deleting the wrong server cannot be undone. When a guard blocks you, treat it as information: someone decided this thing matters. Ask the owner before lifting it. Quick fixes that remove guards are how small clean-ups become incidents.
@@ solution
aws ec2 terminate-instances --instance-ids i-0f02


## The VM is switched off
id: cl-az-vm-deallocated
module: cloud
level: Beginner
minutes: 8
lesson: cloud/compute-and-storage
engine: Simulated Azure command line and subscription
summary: The app VM is deallocated. Check its power state and start it.
@@ story
The internal tool is down. Before reading any logs, check whether the virtual machine is running. Power state only shows when you ask for details.
@@ goals
- Find the VM named app-vm in the resource group rg-app.
- Start it and confirm that it reports running.
@@ hints
- `az vm list -g rg-app -d -o table` shows a PowerState column. Without -d there is no power state.
- `az vm show -g rg-app -n app-vm -d --query powerState -o tsv`
- `az vm start -g rg-app -n app-vm` starts it. A deallocated VM is stopped and not billed for compute.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-app", "location": "westeurope"}], "vms": [{"name": "app-vm", "rg": "rg-app", "state": "deallocated", "size": "Standard_B2s"}, {"name": "db-vm", "rg": "rg-app", "state": "running", "size": "Standard_D2s_v5"}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az vm show -g rg-app -n app-vm -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "app-vm is running",
  "out": "VM running"
 },
 {
  "t": "cmd",
  "run": "az vm show -g rg-app -n db-vm -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "db-vm is untouched",
  "out": "VM running"
 }
]
@@ explain
Azure separates stopped from deallocated. A stopped VM still holds its hardware and is billed. A deallocated VM is released and not billed for compute. Either way it does not serve requests, and the power state only appears when you ask for instance details.
@@ solution
az vm show -g rg-app -n app-vm -d --query powerState -o tsv
az vm start -g rg-app -n app-vm


## HTTPS is blocked by a network rule
id: cl-az-nsg-https
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/virtual-networks
engine: Simulated Azure command line and subscription
summary: Port 443 is dropped by the network security group. Add an allow rule with a free priority.
@@ story
Users get a timeout on https. The VM is running. The network security group nsg-web only allows port 80 and a lower-priority deny blocks everything else. Add a rule for port 443 that wins over the deny.
@@ goals
- Read the rules on nsg-web.
- Add an inbound Allow rule for TCP port 443.
- Give it a priority number lower than the deny rule, and not one already taken.
@@ hints
- `az network nsg rule list -g rg-web --nsg-name nsg-web -o table` shows rules and priorities.
- A lower number is evaluated first. The deny rule has priority 4000.
- `az network nsg rule create -g rg-web --nsg-name nsg-web -n allow-https --priority 120 --access Allow --direction Inbound --protocol Tcp --destination-port-ranges 443`
- Priority 100 is already used by the http rule.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-web", "location": "westeurope"}], "nsgs": [{"name": "nsg-web", "rg": "rg-web", "rules": [{"name": "allow-http", "priority": 100, "access": "Allow", "direction": "Inbound", "protocol": "Tcp", "port": "80", "source": "*"}, {"name": "deny-rest", "priority": 4000, "access": "Deny", "direction": "Inbound", "protocol": "*", "port": "*", "source": "*"}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az network nsg rule list -g rg-web --nsg-name nsg-web --query \"[?destinationPortRange=='443'].access\" -o tsv",
  "code": 0,
  "label": "an Allow rule for 443 exists",
  "out": "Allow"
 },
 {
  "t": "cmd",
  "run": "az network nsg rule list -g rg-web --nsg-name nsg-web --query \"[?name=='allow-http'].priority\" -o tsv",
  "code": 0,
  "label": "the http rule is kept",
  "out": "100"
 },
 {
  "t": "cmd",
  "run": "az network nsg rule list -g rg-web --nsg-name nsg-web --query \"[?name=='deny-rest'].priority\" -o tsv",
  "code": 0,
  "label": "the deny rule is kept",
  "out": "4000"
 }
]
@@ explain
Network security group rules are checked from the lowest priority number upward, and the first match wins. A new allow rule with a number above the deny never gets used. Choose a number below the deny and not already taken, and leave the existing rules alone.
@@ solution
az network nsg rule create -g rg-web --nsg-name nsg-web -n allow-https --priority 120 --access Allow --direction Inbound --protocol Tcp --destination-port-ranges 443


## Storage account allows public blobs
id: cl-az-storage-public
module: cloud
level: Intermediate
minutes: 10
lesson: cloud/security-and-governance
engine: Simulated Azure command line and subscription
summary: A storage account allows public blob access. Turn it off and require TLS 1.2.
@@ story
A review found that the storage account shopdata allows anonymous reading of blobs and accepts old TLS. Change both settings, and do not delete or recreate the account.
@@ goals
- Show the current settings of the account.
- Disable public blob access.
- Set the minimum TLS version to 1.2.
@@ hints
- `az storage account show -g rg-data -n shopdata --query [allowBlobPublicAccess,minimumTlsVersion]`
- `az storage account update -g rg-data -n shopdata --allow-blob-public-access false`
- `az storage account update -g rg-data -n shopdata --min-tls-version TLS1_2` (both options can go in one command).
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-data", "location": "westeurope"}], "storage": [{"name": "shopdata", "rg": "rg-data", "publicBlob": true, "tls": "TLS1_0"}, {"name": "shoplogs", "rg": "rg-data", "publicBlob": false, "tls": "TLS1_2"}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az storage account show -g rg-data -n shopdata --query \"allowBlobPublicAccess\" -o tsv",
  "code": 0,
  "label": "public blob access is off",
  "out": "False|false"
 },
 {
  "t": "cmd",
  "run": "az storage account show -g rg-data -n shopdata --query \"minimumTlsVersion\" -o tsv",
  "code": 0,
  "label": "TLS 1.2 is the minimum",
  "out": "TLS1_2"
 }
]
@@ explain
Settings that apply to a whole account are the quickest way to remove a risk, because they cover every container at once. Always read before you change, change one thing per option, and read again. The same command with show proves the change took effect.
@@ solution
az storage account update -g rg-data -n shopdata --allow-blob-public-access false --min-tls-version TLS1_2


## Clean up temporary resource groups
id: cl-az-delete-temp-groups
module: cloud
level: Beginner
minutes: 10
lesson: cloud/managed-services-and-cost
engine: Simulated Azure command line and subscription
summary: Delete the resource groups tagged as temporary, and only those.
@@ story
Test environments were left behind. Groups created for tests carry the tag purpose=temp. Delete those groups and nothing else. One group has a name that looks temporary but is tagged for production.
@@ goals
- List resource groups with their tags.
- Delete every group tagged purpose=temp.
- Keep every other group, including the one with test in its name that is tagged prod.
@@ hints
- `az group list --query '[].[name,tags.purpose]' -o tsv` shows each group and its purpose.
- Judge by the tag, not by the name.
- `az group delete --name rg-test-a --yes` deletes a group and everything in it.
- Deleting a resource group deletes all its resources. Check the list before every delete.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-test-a", "tags": {"purpose": "temp"}}, {"name": "rg-test-b", "tags": {"purpose": "temp"}}, {"name": "rg-test-payments", "tags": {"purpose": "prod"}}, {"name": "rg-shop", "tags": {"purpose": "prod"}}], "vms": [{"name": "vm-a", "rg": "rg-test-a", "state": "running"}, {"name": "vm-pay", "rg": "rg-test-payments", "state": "running"}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az group list --query \"[?tags.purpose=='temp'].name\" -o tsv",
  "code": 0,
  "label": "no temporary group is left",
  "notOut": "rg-test"
 },
 {
  "t": "cmd",
  "run": "az group list --query \"[].name\" -o tsv",
  "code": 0,
  "label": "the production groups remain",
  "out": "rg-test-payments[\\s\\S]*rg-shop|rg-shop[\\s\\S]*rg-test-payments"
 },
 {
  "t": "cmd",
  "run": "az vm list -g rg-test-payments -o tsv --query \"[].name\"",
  "code": 0,
  "label": "the production VM remains",
  "out": "vm-pay"
 }
]
@@ explain
A resource group deletes everything inside it, so the tag is the safety check, not the name. Names drift and mislead. Read the tags, make a short list, and delete from that list one at a time.
@@ solution
az group list --query '[].[name,tags.purpose]' -o tsv
az group delete --name rg-test-a --yes
az group delete --name rg-test-b --yes


## Reading blobs needs a data role
id: cl-az-blob-role
module: cloud
level: Advanced
minutes: 15
lesson: cloud/identity-and-access
engine: Simulated Azure command line and subscription
summary: Listing blobs fails with a permissions message even though you own the subscription. Grant the right data role at the narrowest scope.
@@ story
You are Contributor on the subscription, yet listing blobs with your login fails. In Azure, management roles and data roles are separate: managing an account is not the same as reading its blobs. Give yourself the read role on this one account, not on the whole subscription.
@@ goals
- Reproduce the error with az storage blob list using --auth-mode login.
- Assign Storage Blob Data Reader to student@example.com.
- Scope it to the storage account shopdata only.
@@ hints
- `az storage blob list --account-name shopdata --container-name exports --auth-mode login`
- The error lists the data roles that would work.
- The account id has the form /subscriptions/ID/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/shopdata. `az storage account show -g rg-data -n shopdata --query id -o tsv` prints it.
- `az role assignment create --assignee student@example.com --role 'Storage Blob Data Reader' --scope ID`
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-data"}], "storage": [{"name": "shopdata", "rg": "rg-data"}], "roles": [{"assignee": "student@example.com", "role": "Contributor", "scope": "/subscriptions/11111111-2222-3333-4444-555555555555"}], "blobs": {"shopdata/exports": ["sales-2026-10.csv", "sales-2026-11.csv"]}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az storage blob list --account-name shopdata --container-name exports --auth-mode login --query \"[].name\" -o tsv",
  "code": 0,
  "label": "the blobs can be listed",
  "out": "sales-2026-11\\.csv"
 },
 {
  "t": "cmd",
  "run": "az role assignment list --assignee student@example.com --query \"[?contains(roleDefinitionName,'Reader')].scope\" -o tsv",
  "code": 0,
  "label": "the role is scoped to the storage account",
  "out": "storageAccounts/shopdata$"
 },
 {
  "t": "cmd",
  "run": "az role assignment list --assignee student@example.com --query \"[].roleDefinitionName\" -o tsv",
  "code": 0,
  "label": "no role was added at subscription scope",
  "notOut": "Owner"
 }
]
@@ explain
Azure has two planes. The management plane creates and changes resources, and the data plane reads and writes what is inside them. A role for one does not grant the other. Grant the smallest data role at the smallest scope, which here is the single account.
@@ solution
az storage account show -g rg-data -n shopdata --query id -o tsv
az role assignment create --assignee student@example.com --role 'Storage Blob Data Reader' --scope /subscriptions/11111111-2222-3333-4444-555555555555/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/shopdata


## Which cloud has the stopped bill?
id: cl-multi-cost-hunt
module: cloud
level: Intermediate
minutes: 15
lesson: cloud/managed-services-and-cost
engine: Simulated AWS and Azure command lines and accounts
summary: One AWS server and one Azure VM were left running after a test. Find both and stop them.
@@ story
The test ended on Friday. Both clouds still show machines tagged purpose=test that are running. Find them in each cloud and stop them (stop, not delete, so the owner can decide). Machines with other tags must keep running.
@@ goals
- Find the running AWS instance tagged purpose=test and stop it.
- Find the running Azure VM tagged purpose=test and deallocate it.
- Leave every other machine running.
@@ hints
- `aws ec2 describe-instances --filters Name=tag:purpose,Values=test Name=instance-state-name,Values=running`
- `az vm list -d --query "[?tags.purpose=='test'].[name,resourceGroup,powerState]" -o tsv`
- `aws ec2 stop-instances --instance-ids i-0g01`
- `az vm deallocate -g rg-lab -n vm-lab-test`. Deallocating stops the compute charge.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0g01", "state": "running", "tags": {"Name": "load-test", "purpose": "test"}}, {"id": "i-0g02", "state": "running", "tags": {"Name": "shop", "purpose": "prod"}}]}, "az": {"groups": [{"name": "rg-lab"}, {"name": "rg-prod"}], "vms": [{"name": "vm-lab-test", "rg": "rg-lab", "state": "running", "tags": {"purpose": "test"}}, {"name": "vm-prod", "rg": "rg-prod", "state": "running", "tags": {"purpose": "prod"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0g01 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "the AWS test server is stopped",
  "out": "stopped"
 },
 {
  "t": "cmd",
  "run": "az vm show -g rg-lab -n vm-lab-test -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "the Azure test VM is deallocated",
  "out": "VM deallocated"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0g02 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "the AWS prod server runs",
  "out": "running"
 },
 {
  "t": "cmd",
  "run": "az vm show -g rg-prod -n vm-prod -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "the Azure prod VM runs",
  "out": "VM running"
 }
]
@@ explain
The same job has different words on each cloud: AWS stops, Azure deallocates, and tags work the same way on both. Filter by tag, read the list, and act on exactly what you read. Stopping rather than deleting keeps the disk and the decision with the owner.
@@ solution
aws ec2 stop-instances --instance-ids i-0g01
az vm deallocate -g rg-lab -n vm-lab-test


## The database port is open to everyone
id: cl-aws-db-port-world
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/virtual-networks
engine: Simulated AWS command line and account
summary: The MySQL port on the database security group allows the whole internet. Close it and allow the app subnet only.
vary: [{"10.0.1.0/24": "10.0.5.0/24"}, {"10.0.1.0/24": "10.0.7.0/24", "db-1": "db-2"}]
@@ story
A scan found that port 3306 on the database accepts connections from 0.0.0.0/0. The shop app lives in the subnet 10.0.1.0/24 and must keep working. SSH from the admin network 10.0.0.0/16 must also stay.
@@ goals
- Read the rules of the security group sg-db.
- Remove the rule that opens TCP 3306 to 0.0.0.0/0.
- Allow TCP 3306 from 10.0.1.0/24 only.
- Keep the SSH rule.
@@ hints
- `aws ec2 describe-security-groups --group-ids sg-db` shows every rule with its source.
- `aws ec2 revoke-security-group-ingress --group-id sg-db --protocol tcp --port 3306 --cidr 0.0.0.0/0` removes exactly that rule.
- Add the narrow rule with `authorize-security-group-ingress` and `--cidr 10.0.1.0/24`.
- Add the new rule before you remove the old one in real life, so the app never loses its connection. Order does not matter in this lab.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0h01", "type": "db.t3.small", "state": "running", "tags": {"Name": "db-1"}, "sgs": ["sg-db"]}], "sgs": [{"id": "sg-db", "name": "db", "ingress": [{"proto": "tcp", "from": 3306, "to": 3306, "cidr": "0.0.0.0/0"}, {"proto": "tcp", "from": 22, "to": 22, "cidr": "10.0.0.0/16"}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-db --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "the app subnet is allowed",
  "out": "10\\.0\\.1\\.0/24"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-db --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "nothing is open to the whole internet",
  "notOut": "0\\.0\\.0\\.0/0"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-db --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "the SSH rule is kept",
  "out": "10\\.0\\.0\\.0/16"
 }
]
@@ explain
A database should never face the internet. The rule that does it is usually a shortcut from a test. Replace it with the narrowest source that works, the subnet of the application, and read the rules again to be sure only that rule changed. Revoking needs the same protocol, port and source that created the rule.
@@ solution
aws ec2 describe-security-groups --group-ids sg-db
aws ec2 authorize-security-group-ingress --group-id sg-db --protocol tcp --port 3306 --cidr 10.0.1.0/24
aws ec2 revoke-security-group-ingress --group-id sg-db --protocol tcp --port 3306 --cidr 0.0.0.0/0


## Stop the dev machines, keep production
id: cl-aws-stop-dev-night
module: cloud
level: Beginner
minutes: 10
lesson: cloud/managed-services-and-cost
engine: Simulated AWS command line and account
summary: Dev servers run all night and cost money. Stop the running ones tagged env=dev and leave production alone.
vary: [{"web-dev": "app-dev", "batch-dev": "etl-dev", "i-0i01": "i-0j11", "i-0i02": "i-0j12"}]
@@ story
Finance asked to switch off the development servers outside working hours. Machines are told apart by the tag env. Stop only the running machines with env=dev. One dev machine is already stopped. Do not touch env=prod.
@@ goals
- List the instances with their env tag and state.
- Stop every running instance tagged env=dev.
- Leave the production instance running.
@@ hints
- `aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,State.Name,Tags]'` is long. Filter with `--filters Name=tag:env,Values=dev`.
- Read the ids before you stop anything.
- `aws ec2 stop-instances --instance-ids i-0i01 i-0i02` takes several ids at once.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0i01", "state": "running", "tags": {"Name": "web-dev", "env": "dev"}}, {"id": "i-0i02", "state": "running", "tags": {"Name": "batch-dev", "env": "dev"}}, {"id": "i-0i03", "state": "running", "tags": {"Name": "shop", "env": "prod"}}, {"id": "i-0i04", "state": "stopped", "tags": {"Name": "old-dev", "env": "dev"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0i01 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "web-dev is stopped",
  "out": "stopped"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0i02 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "batch-dev is stopped",
  "out": "stopped"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0i03 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "production keeps running",
  "out": "running"
 }
]
@@ explain
Tags are how a cloud account is sliced into things you can act on together. Filtering by a tag, reading the ids and then acting only on those ids is the safe loop. Stopping keeps the disk and the configuration, so the machine can start again in the morning.
@@ solution
aws ec2 describe-instances --filters Name=tag:env,Values=dev --query 'Reservations[].Instances[].[InstanceId,State.Name]' --output text
aws ec2 stop-instances --instance-ids i-0i01 i-0i02


## Upload to a bucket that does not exist
id: cl-aws-bucket-typo
module: cloud
level: Beginner
minutes: 8
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated AWS command line and account
summary: An upload fails with NoSuchBucket. The name is one letter off. Find the real bucket and upload there.
vary: [{"shop-backups-prod": "shop-archives-prod", "shop-backup-prod": "shop-archive-prod", "dump.sql": "orders.sql"}]
@@ story
You try to upload the database dump to s3://shop-backup-prod/ and get NoSuchBucket. Do not create a bucket with that name. Somebody already made the right one, and a new bucket would split your backups in two places.
@@ goals
- Find the bucket that holds the backups.
- Upload dump.sql to it.
- Do not create any new bucket.
@@ hints
- `aws s3 ls` with no path lists your buckets.
- The bucket name has an s after backup.
- `aws s3 cp dump.sql s3://shop-backups-prod/` uploads the file.
@@ file /home/user/dump.sql
-- nightly dump
SELECT 1;

@@ world
{"cloud": {"aws": {"buckets": {"shop-backups-prod": {"objects": {"db-2026-10.sql": "-- dump"}}, "shop-uploads": {"objects": {"a.png": "x"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-backups-prod/",
  "code": 0,
  "label": "the dump is in the backup bucket",
  "out": "dump\\.sql"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls",
  "code": 0,
  "label": "no new bucket was created",
  "notOut": "shop-backup-prod"
 }
]
@@ explain
A typo in a bucket name looks like a permission or a network problem, but NoSuchBucket is exact: nothing has that name. Names are global and unique, so list what you own before you create anything. Creating a bucket to make an error go away is how backups end up in two places.
@@ solution
aws s3 ls
aws s3 cp dump.sql s3://shop-backups-prod/


## A job role has far too much power
id: cl-aws-detach-admin
module: cloud
level: Advanced
minutes: 15
lesson: cloud/security-and-governance
engine: Simulated AWS command line and account
summary: The report-job role carries AdministratorAccess. Give it only the policy it needs and keep what it already uses.
vary: [{"report-job": "billing-job", "ConfigBucketRead": "SettingsRead"}]
@@ story
The role report-job runs a nightly report. Someone attached AdministratorAccess to make an error go away. The job only needs to read the config bucket and to keep writing its logs. Replace the broad policy with the right narrow one without breaking the logging.
@@ goals
- List the policies attached to report-job.
- Detach AdministratorAccess.
- Attach ConfigBucketRead.
- Keep LogsWrite attached.
@@ hints
- `aws iam list-attached-role-policies --role-name report-job` shows each attached policy and its ARN.
- `aws iam detach-role-policy --role-name report-job --policy-arn arn:aws:iam::aws:policy/AdministratorAccess`
- `aws iam attach-role-policy --role-name report-job --policy-arn arn:aws:iam::123456789012:policy/ConfigBucketRead`
- Never detach LogsWrite. The job writes its logs with it.
@@ world
{"cloud": {"aws": {"roles": {"report-job": {"policies": ["arn:aws:iam::aws:policy/AdministratorAccess", "arn:aws:iam::123456789012:policy/LogsWrite"]}}, "policies": {"arn:aws:iam::123456789012:policy/LogsWrite": {"name": "LogsWrite"}, "arn:aws:iam::123456789012:policy/ConfigBucketRead": {"name": "ConfigBucketRead"}, "arn:aws:iam::aws:policy/AdministratorAccess": {"name": "AdministratorAccess"}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws iam list-attached-role-policies --role-name report-job --query \"AttachedPolicies[].PolicyName\" --output text",
  "code": 0,
  "label": "AdministratorAccess is gone",
  "notOut": "AdministratorAccess"
 },
 {
  "t": "cmd",
  "run": "aws iam list-attached-role-policies --role-name report-job --query \"AttachedPolicies[].PolicyName\" --output text",
  "code": 0,
  "label": "ConfigBucketRead is attached",
  "out": "ConfigBucketRead"
 },
 {
  "t": "cmd",
  "run": "aws iam list-attached-role-policies --role-name report-job --query \"AttachedPolicies[].PolicyName\" --output text",
  "code": 0,
  "label": "LogsWrite is kept",
  "out": "LogsWrite"
 }
]
@@ explain
Least privilege means a role can do what its job needs and nothing more. A broad policy added to silence an error hides the real missing permission and gives an attacker everything if the job is ever compromised. Name the exact action that failed, grant that, and remove the broad grant.
@@ solution
aws iam list-attached-role-policies --role-name report-job
aws iam attach-role-policy --role-name report-job --policy-arn arn:aws:iam::123456789012:policy/ConfigBucketRead
aws iam detach-role-policy --role-name report-job --policy-arn arn:aws:iam::aws:policy/AdministratorAccess


## Clean up temporary uploads
id: cl-aws-clean-temp-objects
module: cloud
level: Beginner
minutes: 8
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated AWS command line and account
summary: Two temporary files fill the uploads bucket. Delete only the files whose names start with tmp- and keep the rest.
vary: [{"shop-uploads": "shop-media", "keep-orders.csv": "keep-invoices.csv", "customer-7.png": "customer-9.png"}]
@@ story
The shop-uploads bucket has two leftover files from a failed import. Their names start with tmp-. Real customer files sit next to them. Delete the two temporary files and nothing else.
@@ goals
- List the objects in shop-uploads.
- Delete the objects whose names start with tmp-.
- Keep every other object.
@@ hints
- `aws s3 ls s3://shop-uploads/` lists the keys.
- `aws s3 rm s3://shop-uploads/tmp-1.dat` removes one object. Run it once per file.
- Read the list again afterwards.
@@ world
{"cloud": {"aws": {"buckets": {"shop-uploads": {"objects": {"tmp-1.dat": "x", "tmp-2.dat": "y", "keep-orders.csv": "id\n1\n", "customer-7.png": "img"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-uploads/",
  "code": 0,
  "label": "the temporary files are gone",
  "notOut": "tmp-"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-uploads/",
  "code": 0,
  "label": "the orders file is kept",
  "out": "keep-orders\\.csv"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-uploads/",
  "code": 0,
  "label": "the customer file is kept",
  "out": "customer-7\\.png"
 }
]
@@ explain
Deleting from object storage has no recycle bin unless versioning is on. List first, name each key exactly, delete, then list again. A pattern or a wildcard is only as safe as the list you read before using it.
@@ solution
aws s3 ls s3://shop-uploads/
aws s3 rm s3://shop-uploads/tmp-1.dat
aws s3 rm s3://shop-uploads/tmp-2.dat


## SSH is open to the whole internet
id: cl-az-ssh-open-world
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/virtual-networks
engine: Simulated Azure command line and subscription
summary: The network security group allows SSH from anywhere. Replace that rule with one that allows only the office address.
vary: [{"198.51.100.4": "203.0.113.88", "rg-bastion": "rg-jump", "nsg-bastion": "nsg-jump"}]
@@ story
A review found that nsg-bastion lets anyone on the internet try SSH. The office has the fixed address 198.51.100.4. Replace the open rule with a rule for that address only. Keep the final deny rule.
@@ goals
- Read the rules on nsg-bastion.
- Remove the allow rule that has the source *.
- Add an allow rule for TCP 22 from 198.51.100.4/32 with the same priority.
- Keep the deny rule.
@@ hints
- `az network nsg rule list -g rg-bastion --nsg-name nsg-bastion -o table`
- `az network nsg rule delete -g rg-bastion --nsg-name nsg-bastion -n allow-ssh` removes the open rule.
- `az network nsg rule create -g rg-bastion --nsg-name nsg-bastion -n allow-ssh-office --priority 110 --access Allow --direction Inbound --protocol Tcp --destination-port-ranges 22 --source-address-prefixes 198.51.100.4/32`
- A priority number can be used once. Delete first, then create.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-bastion", "location": "westeurope"}], "nsgs": [{"name": "nsg-bastion", "rg": "rg-bastion", "rules": [{"name": "allow-ssh", "priority": 110, "access": "Allow", "direction": "Inbound", "protocol": "Tcp", "port": "22", "source": "*"}, {"name": "deny-rest", "priority": 4000, "access": "Deny", "direction": "Inbound", "protocol": "*", "port": "*", "source": "*"}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az network nsg rule list -g rg-bastion --nsg-name nsg-bastion --query \"[?destinationPortRange=='22'].sourceAddressPrefix\" -o tsv",
  "code": 0,
  "label": "SSH is allowed from the office address",
  "out": "198\\.51\\.100\\.4/32"
 },
 {
  "t": "cmd",
  "run": "az network nsg rule list -g rg-bastion --nsg-name nsg-bastion --query \"[?destinationPortRange=='22'].sourceAddressPrefix\" -o tsv",
  "code": 0,
  "label": "no SSH rule is open to everyone",
  "notOut": "\\*"
 },
 {
  "t": "cmd",
  "run": "az network nsg rule list -g rg-bastion --nsg-name nsg-bastion --query \"[?name=='deny-rest'].priority\" -o tsv",
  "code": 0,
  "label": "the deny rule is kept",
  "out": "4000"
 }
]
@@ explain
An allow rule with the source * is an invitation to every scanner on the internet. A single address with /32 is the narrowest rule. Because each priority number can be used once, replacing a rule means deleting the old one first or choosing a new number.
@@ solution
az network nsg rule list -g rg-bastion --nsg-name nsg-bastion -o table
az network nsg rule delete -g rg-bastion --nsg-name nsg-bastion -n allow-ssh
az network nsg rule create -g rg-bastion --nsg-name nsg-bastion -n allow-ssh-office --priority 110 --access Allow --direction Inbound --protocol Tcp --destination-port-ranges 22 --source-address-prefixes 198.51.100.4/32


## Start the staging machines
id: cl-az-start-staging
module: cloud
level: Beginner
minutes: 8
lesson: cloud/compute-and-storage
engine: Simulated Azure command line and subscription
summary: Two staging VMs were deallocated for the weekend. Start them both and leave the database VM as it is.
vary: [{"rg-staging": "rg-qa", "web-1": "web-2", "api-1": "api-2"}]
@@ story
It is Monday. The staging environment in rg-staging is down because web-1 and api-1 are deallocated. The database VM db-1 is running and must not be restarted.
@@ goals
- List the VMs in rg-staging with their power state.
- Start web-1 and api-1.
- Do not touch db-1.
@@ hints
- `az vm list -g rg-staging -d --query "[].[name,powerState]" -o tsv` lists the state of each VM.
- `az vm start -g rg-staging -n web-1` starts one VM. Run it for each name.
- Check the state again with show and -d.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-staging", "location": "westeurope"}], "vms": [{"name": "web-1", "rg": "rg-staging", "state": "deallocated", "size": "Standard_B2s"}, {"name": "api-1", "rg": "rg-staging", "state": "deallocated", "size": "Standard_B2s"}, {"name": "db-1", "rg": "rg-staging", "state": "running", "size": "Standard_D2s_v5"}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az vm show -g rg-staging -n web-1 -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "web-1 is running",
  "out": "running"
 },
 {
  "t": "cmd",
  "run": "az vm show -g rg-staging -n api-1 -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "api-1 is running",
  "out": "running"
 },
 {
  "t": "cmd",
  "run": "az vm show -g rg-staging -n db-1 -d --query \"powerState\" -o tsv",
  "code": 0,
  "label": "db-1 is still running",
  "out": "running"
 }
]
@@ explain
Starting a deallocated VM allocates hardware again, which can take a minute. Start machines one by one in the order the services need them, and leave anything that is already healthy alone: a needless restart of a database is an outage you caused.
@@ solution
az vm list -g rg-staging -d --query '[].[name,powerState]' -o tsv
az vm start -g rg-staging -n web-1
az vm start -g rg-staging -n api-1


## Give read access to one resource group
id: cl-az-role-scope-rg
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/identity-and-access
engine: Simulated Azure command line and subscription
summary: A contractor needs to look at the app resources. Give Reader on the resource group rg-app only, not on the subscription.
vary: [{"dev@example.com": "temp@example.com", "rg-app": "rg-portal"}]
@@ story
dev@example.com is a contractor who must see the resources in rg-app, but not change them and not see anything else in the subscription. Assign the built-in Reader role at the scope of that resource group.
@@ goals
- Find the id of the resource group rg-app.
- Assign the Reader role to dev@example.com at that scope.
- Do not assign any role at subscription scope.
@@ hints
- `az group show -n rg-app --query id -o tsv` prints the scope.
- `az role assignment create --assignee dev@example.com --role Reader --scope ID`
- Then list the assignments for that user and read the scope column.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-app", "location": "westeurope"}, {"name": "rg-finance", "location": "westeurope"}], "roles": []}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az role assignment list --assignee dev@example.com --query \"[?roleDefinitionName=='Reader'].scope\" -o tsv",
  "code": 0,
  "label": "Reader is assigned on rg-app",
  "out": "resourceGroups/rg-app$"
 },
 {
  "t": "cmd",
  "run": "az role assignment list --assignee dev@example.com --query \"[?scope=='/subscriptions/11111111-2222-3333-4444-555555555555'].roleDefinitionName\" -o tsv",
  "code": 0,
  "label": "nothing is assigned on the whole subscription",
  "notOut": "Reader|Contributor|Owner"
 }
]
@@ explain
A role assignment has three parts: who, which role, and where. The where, called the scope, is the safety control: subscription, resource group, or one resource. Assign at the lowest scope that does the job, and the person cannot see or change anything outside it.
@@ solution
az group show -n rg-app --query id -o tsv
az role assignment create --assignee dev@example.com --role Reader --scope /subscriptions/11111111-2222-3333-4444-555555555555/resourceGroups/rg-app


## Remove the contractor's access
id: cl-aws-revoke-contractor
module: cloud
level: Intermediate
minutes: 10
lesson: cloud/security-and-governance
engine: Simulated AWS command line and account
summary: A contractor finished last week but their office address can still reach SSH. Remove that one rule and keep every other rule.
vary: [{"198.51.100.50": "203.0.113.77", "sg-app": "sg-portal"}]
@@ story
The contract with an outside team ended. Their fixed address 198.51.100.50 can still open SSH on sg-app. Remove exactly that rule. The public web rule and the admin network rule must stay.
@@ goals
- Read the rules of sg-app.
- Remove the SSH rule for 198.51.100.50/32.
- Keep the public HTTPS rule and the admin network rule.
@@ hints
- `aws ec2 describe-security-groups --group-ids sg-app` lists every rule with its source.
- `aws ec2 revoke-security-group-ingress --group-id sg-app --protocol tcp --port 22 --cidr 198.51.100.50/32`
- Revoke needs the same protocol, port and source as the rule. A different source removes a different rule.
- Read the rules again afterwards.
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0m01", "state": "running", "tags": {"Name": "app-1"}, "sgs": ["sg-app"]}], "sgs": [{"id": "sg-app", "name": "app", "ingress": [{"proto": "tcp", "from": 443, "to": 443, "cidr": "0.0.0.0/0"}, {"proto": "tcp", "from": 22, "to": 22, "cidr": "10.0.0.0/16"}, {"proto": "tcp", "from": 22, "to": 22, "cidr": "198.51.100.50/32"}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-app --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "the contractor address is gone",
  "notOut": "198\\.51\\.100\\.50"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-app --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "the admin network rule is kept",
  "out": "10\\.0\\.0\\.0/16"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-app --query \"SecurityGroups[].IpPermissions[].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "the public HTTPS rule is kept",
  "out": "0\\.0\\.0\\.0/0"
 }
]
@@ explain
Access that was given for a job should end with the job. Rules are removed by naming exactly what was added, so read the list first and revoke one rule at a time. A tag or a note on each rule saying who it was for would have made this a one-line task.
@@ solution
aws ec2 describe-security-groups --group-ids sg-app
aws ec2 revoke-security-group-ingress --group-id sg-app --protocol tcp --port 22 --cidr 198.51.100.50/32


## Which server is flooding the network
id: cl-aws-find-ip-stop
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/compute-and-storage
engine: Simulated AWS command line and account
summary: Monitoring names an address, not a server. Find the instance behind it and stop only that one.
vary: [{"10.0.2.37": "10.0.2.91", "batch-x": "report-x", "i-0k02": "i-0k09"}]
@@ story
The network team reports that the host 10.0.2.37 sends a flood of traffic. They gave you the address only. Find the instance that owns it and stop it. The other two servers must keep running.
@@ goals
- Find which instance has the private address 10.0.2.37.
- Stop that instance.
- Leave the other instances running.
@@ hints
- `aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress,State.Name]' --output text` prints one line per instance.
- Match the address to an id before you stop anything.
- `aws ec2 stop-instances --instance-ids ID`
@@ world
{"cloud": {"aws": {"instances": [{"id": "i-0k01", "state": "running", "ip": "10.0.2.15", "tags": {"Name": "web-a"}}, {"id": "i-0k02", "state": "running", "ip": "10.0.2.37", "tags": {"Name": "batch-x"}}, {"id": "i-0k03", "state": "running", "ip": "10.0.2.52", "tags": {"Name": "web-b"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0k02 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "the instance with that address is stopped",
  "out": "stopped"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0k01 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "web-a keeps running",
  "out": "running"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-instances --instance-ids i-0k03 --query \"Reservations[].Instances[].State.Name\" --output text",
  "code": 0,
  "label": "web-b keeps running",
  "out": "running"
 }
]
@@ explain
Alerts and logs usually give an address, and the cloud console shows names and ids. The skill is translating between them with a filtered list. Always map the address to an id and read the line twice before you stop anything, because a wrong stop is a second outage.
@@ solution
aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress,State.Name]' --output text
aws ec2 stop-instances --instance-ids i-0k02


## Create a bucket named after the account
id: cl-aws-account-bucket
module: cloud
level: Beginner
minutes: 8
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated AWS command line and account
summary: The team names log buckets logs- followed by the account number. Find the number and create the bucket.
vary: [{"123456789012": "210987654321"}]
@@ story
Bucket names are shared by every AWS customer, so your team adds the account number to make log bucket names unique: logs-ACCOUNTID. You do not remember the account number. Ask the command line who you are, then create the bucket.
@@ goals
- Find the account number.
- Create a bucket named logs- followed by that number.
- Leave the existing bucket alone.
@@ hints
- `aws sts get-caller-identity` shows Account, UserId and Arn.
- `aws sts get-caller-identity --query Account --output text` prints only the number.
- `aws s3 mb s3://logs-ACCOUNTID` creates a bucket.
@@ world
{"cloud": {"aws": {"account": "123456789012", "buckets": {"shop-data": {"objects": {"a.txt": "x"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3 ls",
  "code": 0,
  "label": "the log bucket exists",
  "out": "logs-123456789012"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls",
  "code": 0,
  "label": "the existing bucket is untouched",
  "out": "shop-data"
 }
]
@@ explain
Names that must be globally unique are often built from something unique to you, such as the account number. sts get-caller-identity is the first command to run in any unfamiliar shell, because every later command runs as that identity in that account.
@@ solution
aws sts get-caller-identity --query Account --output text
aws s3 mb s3://logs-123456789012


## Upload this month's files to the right folder
id: cl-aws-upload-prefix
module: cloud
level: Beginner
minutes: 8
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated AWS command line and account
summary: Two reports must go into the 2026/11/ folder of the reports bucket. Object storage has no folders, only key prefixes.
vary: [{"shop-reports": "shop-finance", "sales.csv": "orders.csv", "refunds.csv": "returns.csv"}]
@@ story
Finance wants sales.csv and refunds.csv from this month in the shop-reports bucket under 2026/11/. October's files are already under 2026/10/. Upload both files with the right key prefix and leave the old ones alone.
@@ goals
- Upload sales.csv to s3://shop-reports/2026/11/.
- Upload refunds.csv to the same prefix.
- Do not change the October files.
@@ hints
- `aws s3 ls s3://shop-reports/` shows what is already there.
- `aws s3 cp sales.csv s3://shop-reports/2026/11/` ends with a slash, so the file name is added to the key.
- Run the same command for the second file.
@@ file /home/user/sales.csv
m,t
11,5200

@@ file /home/user/refunds.csv
m,t
11,95

@@ world
{"cloud": {"aws": {"buckets": {"shop-reports": {"objects": {"2026/10/sales.csv": "m,t\n10,4800\n", "2026/10/refunds.csv": "m,t\n10,120\n"}}}}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-reports/2026/11/",
  "code": 0,
  "label": "sales.csv is in the November folder",
  "out": "sales\\.csv"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-reports/2026/11/",
  "code": 0,
  "label": "refunds.csv is in the November folder",
  "out": "refunds\\.csv"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://shop-reports/2026/10/",
  "code": 0,
  "label": "October is untouched",
  "out": "2026/10/sales\\.csv"
 }
]
@@ explain
S3 has no real folders. A folder is just a shared beginning of the object key, called a prefix. A trailing slash on the destination tells the command to append the file name to it. Listing with the prefix shows what lives under it.
@@ solution
aws s3 cp sales.csv s3://shop-reports/2026/11/
aws s3 cp refunds.csv s3://shop-reports/2026/11/


## SSH is open to the world on two groups
id: cl-aws-sg-ssh-everywhere
module: cloud
level: Advanced
minutes: 15
lesson: cloud/security-and-governance
engine: Simulated AWS command line and account
summary: Two security groups accept SSH from anywhere. Close that on both, allow the management network instead, and keep the web and batch ports.
@@ story
A review found SSH open to 0.0.0.0/0 on sg-web and on sg-batch. Remove those two rules. Admins connect from the management network 10.0.0.0/16, so allow SSH from there on both groups. Port 443 on sg-web must stay public and port 8080 on sg-batch must stay for the internal network.
@@ goals
- List the rules of both security groups.
- Remove SSH from 0.0.0.0/0 on sg-web and sg-batch.
- Allow SSH from 10.0.0.0/16 on both.
- Keep 443 public on sg-web and 8080 on sg-batch.
@@ hints
- `aws ec2 describe-security-groups --group-ids sg-web sg-batch` shows both.
- `aws ec2 revoke-security-group-ingress --group-id sg-web --protocol tcp --port 22 --cidr 0.0.0.0/0`
- `aws ec2 authorize-security-group-ingress --group-id sg-web --protocol tcp --port 22 --cidr 10.0.0.0/16`
- Repeat both commands for sg-batch. Port 443 also uses 0.0.0.0/0, so check the port in every command you run.
@@ world
{"cloud": {"aws": {"sgs": [{"id": "sg-web", "name": "web", "ingress": [{"proto": "tcp", "from": 443, "to": 443, "cidr": "0.0.0.0/0"}, {"proto": "tcp", "from": 22, "to": 22, "cidr": "0.0.0.0/0"}]}, {"id": "sg-batch", "name": "batch", "ingress": [{"proto": "tcp", "from": 8080, "to": 8080, "cidr": "10.0.0.0/16"}, {"proto": "tcp", "from": 22, "to": 22, "cidr": "0.0.0.0/0"}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-web --query \"SecurityGroups[].IpPermissions[]|[?FromPort=='22'].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "sg-web allows SSH only from the management network",
  "out": "10\\.0\\.0\\.0/16",
  "notOut": "0\\.0\\.0\\.0/0"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-batch --query \"SecurityGroups[].IpPermissions[]|[?FromPort=='22'].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "sg-batch allows SSH only from the management network",
  "out": "10\\.0\\.0\\.0/16",
  "notOut": "0\\.0\\.0\\.0/0"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-web --query \"SecurityGroups[].IpPermissions[]|[?FromPort=='443'].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "HTTPS stays public on sg-web",
  "out": "0\\.0\\.0\\.0/0"
 },
 {
  "t": "cmd",
  "run": "aws ec2 describe-security-groups --group-ids sg-batch --query \"SecurityGroups[].IpPermissions[]|[?FromPort=='8080'].IpRanges[].CidrIp\" --output text",
  "code": 0,
  "label": "port 8080 stays on sg-batch",
  "out": "10\\.0\\.0\\.0/16"
 }
]
@@ explain
The same source address can appear on very different rules, so a fix has to name the port as well as the source. Doing the add before the remove keeps administrators connected during the change. Always list the rules again at the end and check each port, not only the overall picture.
@@ solution
aws ec2 authorize-security-group-ingress --group-id sg-web --protocol tcp --port 22 --cidr 10.0.0.0/16
aws ec2 revoke-security-group-ingress --group-id sg-web --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id sg-batch --protocol tcp --port 22 --cidr 10.0.0.0/16
aws ec2 revoke-security-group-ingress --group-id sg-batch --protocol tcp --port 22 --cidr 0.0.0.0/0


## Delete only the retired VMs
id: cl-az-vm-delete-decom
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/managed-services-and-cost
engine: Simulated Azure command line and subscription
summary: Two VMs are tagged for decommission. Delete exactly those, keep the resource group and the live VM.
vary: [{"rg-legacy": "rg-old", "old-app": "retired-app", "old-db": "retired-db", "keep-app": "live-app"}]
@@ story
The legacy resource group rg-legacy holds two VMs tagged decommission=true and one live VM. Delete the two tagged ones. Do not delete the resource group, because the live VM and its settings are in it.
@@ goals
- List the VMs in rg-legacy with their decommission tag.
- Delete every VM tagged decommission=true.
- Keep the live VM and the resource group.
@@ hints
- `az vm list -g rg-legacy --query "[].[name,tags.decommission]" -o tsv` shows each VM and its tag.
- `az vm delete -g rg-legacy -n NAME --yes` deletes one VM.
- Do not delete the group. Deleting a group deletes everything in it.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-legacy", "location": "westeurope"}], "vms": [{"name": "old-app", "rg": "rg-legacy", "state": "stopped", "tags": {"decommission": "true"}}, {"name": "old-db", "rg": "rg-legacy", "state": "deallocated", "tags": {"decommission": "true"}}, {"name": "keep-app", "rg": "rg-legacy", "state": "running", "tags": {"decommission": "false"}}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az vm list -g rg-legacy --query \"[].name\" -o tsv",
  "code": 0,
  "label": "old-app is gone",
  "notOut": "old-app"
 },
 {
  "t": "cmd",
  "run": "az vm list -g rg-legacy --query \"[].name\" -o tsv",
  "code": 0,
  "label": "old-db is gone",
  "notOut": "old-db"
 },
 {
  "t": "cmd",
  "run": "az vm list -g rg-legacy --query \"[].name\" -o tsv",
  "code": 0,
  "label": "the live VM is kept",
  "out": "keep-app"
 },
 {
  "t": "cmd",
  "run": "az group list --query \"[].name\" -o tsv",
  "code": 0,
  "label": "the resource group is kept",
  "out": "rg-legacy"
 }
]
@@ explain
Deleting a single resource is narrower than deleting its group. Choose by tag, not by name, list again after each delete and stop if the list is not what you expected. Cost tools and tags exist so that these decisions are written down before the day you act on them.
@@ solution
az vm list -g rg-legacy --query '[].[name,tags.decommission]' -o tsv
az vm delete -g rg-legacy -n old-app --yes
az vm delete -g rg-legacy -n old-db --yes


## A contractor still has Owner
id: cl-az-remove-owner
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/identity-and-access
engine: Simulated Azure command line and subscription
summary: Remove the contractor's Owner role on the subscription but keep their Reader role on one group.
vary: [{"contractor@example.com": "vendor@example.com", "ops@example.com": "admin@example.com"}]
@@ story
contractor@example.com was given Owner on the whole subscription for a one-day fix and also has Reader on rg-app, which they still need. Remove only the Owner assignment. ops@example.com is Owner too and must keep it.
@@ goals
- List the role assignments for contractor@example.com.
- Delete the Owner assignment for that person.
- Keep their Reader assignment and ops@example.com's Owner role.
@@ hints
- `az role assignment list --assignee contractor@example.com -o table` shows both assignments.
- `az role assignment delete --assignee contractor@example.com --role Owner` removes only Owner.
- A command without --role would remove every assignment for that person.
@@ world
{"cloud": {"az": {"groups": [{"name": "rg-app", "location": "westeurope"}], "roles": [{"assignee": "contractor@example.com", "role": "Owner", "scope": "/subscriptions/11111111-2222-3333-4444-555555555555"}, {"assignee": "contractor@example.com", "role": "Reader", "scope": "/subscriptions/11111111-2222-3333-4444-555555555555/resourceGroups/rg-app"}, {"assignee": "ops@example.com", "role": "Owner", "scope": "/subscriptions/11111111-2222-3333-4444-555555555555"}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "az role assignment list --assignee contractor@example.com --query \"[].roleDefinitionName\" -o tsv",
  "code": 0,
  "label": "the contractor no longer has Owner",
  "notOut": "Owner"
 },
 {
  "t": "cmd",
  "run": "az role assignment list --assignee contractor@example.com --query \"[].roleDefinitionName\" -o tsv",
  "code": 0,
  "label": "the contractor keeps Reader",
  "out": "Reader"
 },
 {
  "t": "cmd",
  "run": "az role assignment list --assignee ops@example.com --query \"[].roleDefinitionName\" -o tsv",
  "code": 0,
  "label": "ops keeps Owner",
  "out": "Owner"
 }
]
@@ explain
Owner can change access for everyone, so it is the most dangerous role to leave behind. Delete assignments with the narrowest filter that names exactly one: person plus role plus scope. A delete with only the person removes everything that person has, which is the usual way to lock someone out by mistake.
@@ solution
az role assignment list --assignee contractor@example.com -o table
az role assignment delete --assignee contractor@example.com --role Owner


## Close the public files on both clouds
id: cl-multi-public-audit
module: cloud
level: Intermediate
minutes: 15
lesson: cloud/security-and-governance
engine: Simulated AWS and Azure command lines and accounts
summary: One public bucket in AWS and one public storage account in Azure hold the same team files. Make both private.
vary: [{"team-files": "hr-files", "teamfiles": "hrfiles", "rg-team": "rg-hr"}]
@@ story
An audit lists two public resources for the same team: the S3 bucket team-files and the Azure storage account teamfiles. Make both private without deleting any data.
@@ goals
- Make the S3 bucket team-files private.
- Turn off public blob access on the storage account teamfiles.
- Keep the files.
@@ hints
- `aws s3api put-bucket-acl --bucket team-files --acl private`
- `az storage account update -g rg-team -n teamfiles --allow-blob-public-access false`
- Check each with get-bucket-policy-status and with az storage account show.
@@ world
{"cloud": {"aws": {"buckets": {"team-files": {"acl": "public-read", "objects": {"plan.pdf": "x"}}}}, "az": {"groups": [{"name": "rg-team", "location": "westeurope"}], "storage": [{"name": "teamfiles", "rg": "rg-team", "publicBlob": true, "tls": "TLS1_2"}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "aws s3api get-bucket-policy-status --bucket team-files --query \"PolicyStatus.IsPublic\" --output text",
  "code": 0,
  "label": "the S3 bucket is no longer public",
  "out": "False"
 },
 {
  "t": "cmd",
  "run": "az storage account show -g rg-team -n teamfiles --query \"allowBlobPublicAccess\" -o tsv",
  "code": 0,
  "label": "public blob access is off on Azure",
  "out": "False|false"
 },
 {
  "t": "cmd",
  "run": "aws s3 ls s3://team-files/",
  "code": 0,
  "label": "the files are kept",
  "out": "plan\\.pdf"
 }
]
@@ explain
The same risk has a different switch on each cloud: an ACL and a public access block on AWS, an account setting on Azure. A good audit finds the risk, then fixes each platform with its own control and checks the result with its own read command.
@@ solution
aws s3api put-bucket-acl --bucket team-files --acl private
az storage account update -g rg-team -n teamfiles --allow-blob-public-access false

## The VM is missing in the wrong project
id: cl-gcp-wrong-project
module: cloud
level: Beginner
minutes: 8
lesson: cloud/cloud-fundamentals
engine: Simulated Google Cloud command line and project
summary: gcloud says the VM does not exist because the command line points at the dev project. Switch to production and start it.
@@ story
A teammate says web-1 is stopped, and you cannot even find it. Nothing is deleted. Your gcloud is set to shop-dev, but the server lives in shop-prod. Check the active project, switch it and start the server.
@@ goals
- Find which project gcloud is using.
- Switch to the project that contains web-1.
- Start web-1 and see it RUNNING.
@@ hints
- `gcloud config get-value project` prints the active project, and `gcloud projects list` shows what you can use.
- `gcloud config set project shop-prod` changes the default.
- `gcloud compute instances start web-1 --zone europe-west1-b` starts it.
@@ world
{"more": {"gcp": {"project": "shop-dev", "account": "asha@example.com", "projects": [{"id": "shop-dev", "name": "Shop Dev", "number": "100000000001", "bindings": []}, {"id": "shop-prod", "name": "Shop Prod", "number": "100000000002", "bindings": []}], "instances": [{"project": "shop-prod", "name": "web-1", "zone": "europe-west1-b", "machineType": "e2-small", "internalIp": "10.132.0.4", "externalIp": "34.0.0.10", "status": "TERMINATED"}, {"project": "shop-dev", "name": "scratch-1", "zone": "europe-west1-b", "machineType": "e2-micro", "internalIp": "10.132.0.9", "status": "RUNNING"}], "firewalls": [], "buckets": []}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "gcloud config get-value project",
  "code": 0,
  "label": "gcloud uses shop-prod",
  "out": "shop-prod"
 },
 {
  "t": "cmd",
  "run": "gcloud compute instances list --format='value(name,status)'",
  "code": 0,
  "label": "web-1 is running",
  "out": "web-1\\s+RUNNING"
 }
]
@@ explain
Every gcloud command acts on one project, taken from the --project flag or the active configuration. A resource that is invisible is often just in another project. Check the project first, before you suspect permissions or deletion. In production work, many teams show the project in the shell prompt.
@@ solution
gcloud config get-value project
gcloud projects list
gcloud config set project shop-prod
gcloud compute instances start web-1 --zone europe-west1-b
gcloud compute instances list


## SSH to the bastion times out
id: cl-gcp-ssh-firewall
module: cloud
level: Intermediate
minutes: 12
lesson: cloud/virtual-networks
engine: Simulated Google Cloud command line and project
summary: The bastion VM runs, but SSH is blocked by the VPC firewall. Allow port 22 from the office address only.
@@ story
SSH to bastion-1 times out from the office. The VM is running, so a firewall rule is dropping the traffic. The office address is 203.0.113.7. Add a narrow rule; opening port 22 to the internet is not acceptable.
@@ goals
- List the firewall rules and confirm that none allows port 22.
- Create allow-ssh-office for tcp:22 from 203.0.113.7/32.
- Do not open 0.0.0.0/0.
@@ hints
- `gcloud compute firewall-rules list` shows the rules and what they allow.
- `gcloud compute firewall-rules create NAME --allow tcp:22 --source-ranges RANGE` creates one.
- Use --source-ranges 203.0.113.7/32 to allow a single address.
@@ world
{"more": {"gcp": {"project": "shop-prod", "account": "asha@example.com", "projects": [{"id": "shop-dev", "name": "Shop Dev", "number": "100000000001", "bindings": []}, {"id": "shop-prod", "name": "Shop Prod", "number": "100000000002", "bindings": []}], "instances": [{"project": "shop-prod", "name": "bastion-1", "zone": "europe-west1-b", "machineType": "e2-micro", "internalIp": "10.132.0.2", "externalIp": "34.0.0.22", "status": "RUNNING"}], "firewalls": [{"project": "shop-prod", "name": "default-allow-internal", "network": "default", "direction": "INGRESS", "priority": 65534, "allowed": [{"protocol": "tcp", "ports": ["0-65535"]}], "sourceRanges": ["10.128.0.0/9"]}, {"project": "shop-prod", "name": "allow-https", "network": "default", "direction": "INGRESS", "priority": 1000, "allowed": [{"protocol": "tcp", "ports": ["443"]}], "sourceRanges": ["0.0.0.0/0"]}], "buckets": []}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "gcloud compute firewall-rules list --filter=name=allow-ssh-office --format='value(name,sourceRanges)'",
  "code": 0,
  "label": "the rule allows only the office address",
  "out": "allow-ssh-office\\s+203\\.0\\.113\\.7/32"
 },
 {
  "t": "cmd",
  "run": "gcloud compute firewall-rules list --filter=name=allow-ssh-office --format='value(sourceRanges)'",
  "code": 0,
  "label": "port 22 is not open to the world",
  "notOut": "0\\.0\\.0\\.0/0"
 }
]
@@ explain
GCP firewall rules belong to the VPC network and match by direction, ports and source ranges. A timeout, not a refusal, means packets are dropped on the way. The cleanest fix is a rule scoped to one address or to a target tag, and a better long-term design is Identity-Aware Proxy or a VPN, so nobody needs a public SSH port.
@@ solution
gcloud compute firewall-rules list
gcloud compute firewall-rules create allow-ssh-office --allow tcp:22 --source-ranges 203.0.113.7/32
gcloud compute firewall-rules list


## A contractor still has Owner
id: cl-gcp-remove-owner
module: cloud
level: Intermediate
minutes: 10
lesson: cloud/identity-and-access
engine: Simulated Google Cloud command line and project
summary: A finished contractor is an Owner on the production project. Remove the role and give read access instead.
@@ story
The contract ended last week, but contractor@example.com is still an Owner on shop-prod. Remove that binding and grant the viewer role instead so they can still read dashboards during handover. Leave ops@example.com exactly as it is.
@@ goals
- Read the IAM policy of shop-prod.
- Remove roles/owner from the contractor.
- Add roles/viewer for the contractor and leave ops@example.com as Owner.
@@ hints
- `gcloud projects get-iam-policy shop-prod` lists bindings by role.
- `gcloud projects remove-iam-policy-binding shop-prod --member=user:contractor@example.com --role=roles/owner`.
- `gcloud projects add-iam-policy-binding shop-prod --member=user:contractor@example.com --role=roles/viewer`.
@@ world
{"more": {"gcp": {"project": "shop-prod", "account": "asha@example.com", "projects": [{"id": "shop-dev", "name": "Shop Dev", "number": "100000000001", "bindings": []}, {"id": "shop-prod", "name": "Shop Prod", "number": "100000000002", "bindings": [{"role": "roles/owner", "members": ["user:ops@example.com", "user:contractor@example.com"]}]}], "instances": [], "firewalls": [], "buckets": []}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "gcloud projects get-iam-policy shop-prod --format=json",
  "code": 0,
  "label": "the contractor is no longer an Owner",
  "notOut": "roles/owner\"\\s*,\\s*\"members\":\\s*\\[[^\\]]*contractor"
 },
 {
  "t": "cmd",
  "run": "gcloud projects get-iam-policy shop-prod --format=json",
  "code": 0,
  "label": "the contractor is a viewer",
  "out": "roles/viewer\"\\s*,\\s*\"members\":\\s*\\[[^\\]]*contractor"
 },
 {
  "t": "cmd",
  "run": "gcloud projects get-iam-policy shop-prod --format=json",
  "code": 0,
  "label": "ops is still an Owner",
  "out": "roles/owner\"\\s*,\\s*\"members\":\\s*\\[[^\\]]*ops@example\\.com"
 }
]
@@ explain
IAM bindings pair a member with a role on a resource. Owner is the broadest basic role and almost never right for a contractor. Remove it, grant the least role that works and review access when a contract ends. Access reviews and expiry conditions turn this from memory work into a routine.
@@ solution
gcloud projects get-iam-policy shop-prod
gcloud projects remove-iam-policy-binding shop-prod --member=user:contractor@example.com --role=roles/owner
gcloud projects add-iam-policy-binding shop-prod --member=user:contractor@example.com --role=roles/viewer
gcloud projects get-iam-policy shop-prod


## A Cloud Storage bucket is public
id: cl-gcp-public-bucket
module: cloud
level: Beginner
minutes: 10
lesson: cloud/object-storage-and-data-lifecycle
engine: Simulated Google Cloud command line and project
summary: allUsers can read the exports bucket. Turn on public access prevention so nobody can make it public again.
@@ story
A scanner found that gs://customer-exports grants read access to allUsers. Customer data must not be public. Enforce public access prevention on the bucket and keep the bucket itself.
@@ goals
- Describe the bucket and find the allUsers grant.
- Enforce public access prevention.
- Keep the bucket.
@@ hints
- `gcloud storage buckets describe gs://customer-exports` shows its IAM and settings.
- `gcloud storage buckets update gs://customer-exports --public-access-prevention` enforces it.
- Describe the bucket again to confirm that allUsers is gone.
@@ world
{"more": {"gcp": {"project": "shop-prod", "account": "asha@example.com", "projects": [{"id": "shop-dev", "name": "Shop Dev", "number": "100000000001", "bindings": []}, {"id": "shop-prod", "name": "Shop Prod", "number": "100000000002", "bindings": []}], "instances": [], "firewalls": [], "buckets": [{"project": "shop-prod", "name": "customer-exports", "location": "EUROPE-WEST1", "iam": [{"role": "roles/storage.objectViewer", "members": ["allUsers"]}]}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "gcloud storage buckets describe gs://customer-exports",
  "code": 0,
  "label": "prevention is enforced",
  "out": "enforced"
 },
 {
  "t": "cmd",
  "run": "gcloud storage buckets describe gs://customer-exports",
  "code": 0,
  "label": "allUsers has no access",
  "notOut": "allUsers"
 },
 {
  "t": "cmd",
  "run": "gcloud storage buckets list --format='value(name)'",
  "code": 0,
  "label": "the bucket still exists",
  "out": "customer-exports"
 }
]
@@ explain
Public access prevention blocks any grant to allUsers or allAuthenticatedUsers on a bucket, whatever IAM says. It is the Cloud Storage equivalent of the S3 block public access setting. An organisation policy can enforce it for every bucket in a folder or project.
@@ solution
gcloud storage buckets describe gs://customer-exports
gcloud storage buckets update gs://customer-exports --public-access-prevention
gcloud storage buckets describe gs://customer-exports

