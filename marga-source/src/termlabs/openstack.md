## The big server ends in ERROR
id: os-no-valid-host
module: openstack
level: Intermediate
minutes: 12
lesson: openstack/compute-flavors-images-and-scheduling
engine: Simulated OpenStack command line and project
summary: A large server fails with No valid host was found. Read the fault, free room from throw-away servers and create it again.
@@ story
db-1 was created with the m1.xlarge flavor and went straight to ERROR. The cloud has one small compute host that is nearly full, mostly because of old tmp-load servers from a test. Production servers must not be touched. Free enough room, delete the failed db-1 and create it again.
@@ goals
- Read the fault on db-1.
- Delete only the tmp-load test servers you need to, and the failed db-1.
- Create db-1 again so that it is ACTIVE.
@@ hints
- `openstack server show db-1` shows the fault. `openstack flavor list` shows the RAM each flavor needs.
- The host has 64 GB. web-1, web-2 and db-0 are production. The tmp-load servers are tests.
- `openstack server delete db-1 tmp-load-1`, then `openstack server create --flavor m1.xlarge --image ubuntu-22.04 db-1`.
@@ world
{"more": {"os": {"project": "shop", "user": "asha", "host": {"ramMB": 65536}, "flavors": [{"name": "m1.small", "ram": 2048, "disk": 20, "vcpus": 1}, {"name": "m1.large", "ram": 8192, "disk": 80, "vcpus": 4}, {"name": "m1.xlarge", "ram": 16384, "disk": 160, "vcpus": 8}], "images": ["ubuntu-22.04"], "networks": ["private", "public"], "quotas": {"instances": 12, "cores": 64, "ram": 131072}, "secgroups": [{"id": "sg-default", "name": "default", "desc": "Default", "rules": []}], "servers": [{"id": "3f2a1000-0000-4e5f-9a0b-000000000001", "name": "web-1", "status": "ACTIVE", "flavor": "m1.large", "image": "ubuntu-22.04", "networks": "private=10.0.0.11", "secgroups": ["default"]}, {"id": "3f2a2000-0000-4e5f-9a0b-000000000002", "name": "web-2", "status": "ACTIVE", "flavor": "m1.large", "image": "ubuntu-22.04", "networks": "private=10.0.0.12", "secgroups": ["default"]}, {"id": "3f2a3000-0000-4e5f-9a0b-000000000003", "name": "db-0", "status": "ACTIVE", "flavor": "m1.xlarge", "image": "ubuntu-22.04", "networks": "private=10.0.0.13", "secgroups": ["default"]}, {"id": "3f2a4000-0000-4e5f-9a0b-000000000004", "name": "tmp-load-1", "status": "ACTIVE", "flavor": "m1.large", "image": "ubuntu-22.04", "networks": "private=10.0.0.14", "secgroups": ["default"]}, {"id": "3f2a5000-0000-4e5f-9a0b-000000000005", "name": "tmp-load-2", "status": "ACTIVE", "flavor": "m1.large", "image": "ubuntu-22.04", "networks": "private=10.0.0.15", "secgroups": ["default"]}, {"id": "3f2a6000-0000-4e5f-9a0b-000000000006", "name": "tmp-load-3", "status": "ACTIVE", "flavor": "m1.large", "image": "ubuntu-22.04", "networks": "private=10.0.0.16", "secgroups": ["default"]}, {"id": "3f2a7000-0000-4e5f-9a0b-000000000007", "name": "db-1", "status": "ERROR", "flavor": "m1.xlarge", "image": "ubuntu-22.04", "networks": "", "secgroups": ["default"], "fault": "No valid host was found. There are not enough hosts available."}], "volumes": []}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "openstack server list",
  "code": 0,
  "label": "db-1 is ACTIVE",
  "out": "\\|\\s*db-1\\s*\\|\\s*ACTIVE"
 },
 {
  "t": "cmd",
  "run": "openstack server list",
  "code": 0,
  "label": "web-1 is still there",
  "out": "web-1"
 },
 {
  "t": "cmd",
  "run": "openstack server list",
  "code": 0,
  "label": "web-2 is still there",
  "out": "web-2"
 },
 {
  "t": "cmd",
  "run": "openstack server list",
  "code": 0,
  "label": "db-0 is still there",
  "out": "db-0"
 }
]
@@ explain
No valid host means no compute node passed every scheduler check, here simply because the one host had too little free memory. Memory has to be free on a single host, so the fix was to free room by removing servers that nobody needs, never production ones. Failed ERROR servers still count against quota, so clean them up.
@@ solution
openstack server show db-1
openstack flavor list
openstack server delete db-1 tmp-load-1
openstack server create --flavor m1.xlarge --image ubuntu-22.04 db-1
openstack server list


## SSH works from the office but not from home
id: os-ssh-security-group
module: openstack
level: Beginner
minutes: 10
lesson: openstack/neutron-networking-security-groups-and-floating-ips
engine: Simulated OpenStack command line and project
summary: An engineer at home cannot SSH to the bastion. Add a narrow security group rule for the home address.
@@ story
Colleagues reach bastion-1 from the office, but the engineer at home times out. The home address is 203.0.113.88. Add a rule for that single address on port 22 to the bastion security group. Do not open SSH to the world.
@@ goals
- Read the rules of the bastion security group.
- Add an ingress rule for tcp port 22 from 203.0.113.88/32.
- Do not allow 0.0.0.0/0.
@@ hints
- `openstack security group rule list bastion` shows that only the office range is allowed.
- `openstack security group rule create --proto tcp --dst-port 22 --remote-ip RANGE bastion` adds a rule.
- Use the /32 suffix to allow exactly one address.
@@ world
{"more": {"os": {"project": "shop", "user": "asha", "host": {"ramMB": 65536}, "flavors": [{"name": "m1.small", "ram": 2048, "disk": 20, "vcpus": 1}], "images": ["ubuntu-22.04"], "networks": ["private", "public"], "quotas": {"instances": 10, "cores": 20, "ram": 51200}, "secgroups": [{"id": "sg-bastion", "name": "bastion", "desc": "Bastion", "rules": [{"proto": "tcp", "port": 22, "cidr": "198.51.100.0/24", "dir": "ingress"}]}], "servers": [{"id": "3f2a1000-0000-4e5f-9a0b-000000000001", "name": "bastion-1", "status": "ACTIVE", "flavor": "m1.small", "image": "ubuntu-22.04", "networks": "private=10.0.0.11", "secgroups": ["bastion"]}], "volumes": []}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "openstack security group rule list bastion",
  "code": 0,
  "label": "the home address is allowed on 22",
  "out": "203\\.0\\.113\\.88/32"
 },
 {
  "t": "cmd",
  "run": "openstack security group rule list bastion",
  "code": 0,
  "label": "SSH is not open to the world",
  "notOut": "0\\.0\\.0\\.0/0"
 },
 {
  "t": "cmd",
  "run": "openstack security group rule list bastion",
  "code": 0,
  "label": "the office rule is kept",
  "out": "198\\.51\\.100\\.0/24"
 }
]
@@ explain
A security group only allows traffic; anything not allowed is dropped, which is why a client outside the listed range simply times out. The tidy fix is a narrow rule for the one address, and in the long run a VPN or a bastion with a fixed address, so that rules do not collect individual home addresses.
@@ solution
openstack security group rule list bastion
openstack security group rule create --proto tcp --dst-port 22 --remote-ip 203.0.113.88/32 bastion
openstack security group rule list bastion


## Raise the CPU allocation ratio safely
id: os-cpu-ratio
module: openstack
level: Advanced
minutes: 10
lesson: openstack/compute-flavors-images-and-scheduling
engine: Simulated Linux shell with configuration files
summary: Set the CPU allocation ratio on compute nodes to 4 and keep RAM at 1.
@@ story
The cloud reports No valid host for CPU while hosts are mostly idle. The scheduler is using a ratio of 1, so every vCPU needs a physical core. Set cpu_allocation_ratio to 4.0 and leave ram_allocation_ratio at 1.0.
@@ goals
- Read nova.conf and usage.txt.
- Set cpu_allocation_ratio = 4.0.
- Keep ram_allocation_ratio = 1.0.
@@ hints
- `cat usage.txt` shows CPU used 8 percent.
- Edit the two options in nova.conf.
- `sed -i 's/cpu_allocation_ratio = 1.0/cpu_allocation_ratio = 4.0/' nova.conf`
@@ world
{"cwd": "/home/user/os"}
@@ file /home/user/os/usage.txt
compute-3: vcpus allocated 32/32, real CPU use 8%
ram allocated 90/256 GB

@@ file /home/user/os/nova.conf
[DEFAULT]
cpu_allocation_ratio = 1.0
ram_allocation_ratio = 1.0

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/os/nova.conf",
  "label": "CPU ratio is 4",
  "re": "cpu_allocation_ratio\\s*=\\s*4\\.0"
 },
 {
  "t": "contains",
  "path": "/home/user/os/nova.conf",
  "label": "RAM ratio is still 1",
  "re": "ram_allocation_ratio\\s*=\\s*1\\.0"
 }
]
@@ explain
The allocation ratio lets the scheduler promise more vCPUs than cores, which is safe while real use is low. Memory should stay at 1 because swapping or killing guests is far worse than waiting for CPU.
@@ solution
cat usage.txt
cat nova.conf
sed -i 's/cpu_allocation_ratio = 1.0/cpu_allocation_ratio = 4.0/' nova.conf
cat nova.conf


## Wrong project in clouds.yaml
id: os-clouds-project
module: openstack
level: Intermediate
minutes: 10
lesson: openstack/identity-projects-quotas-and-keystone
engine: Simulated Linux shell with configuration files
summary: A client sees an empty project. Fix the project name in clouds.yaml.
@@ story
openstack server list returns nothing, though the shop team has servers. The credentials file points at the project sandbox. Change project_name to shop and keep the user name.
@@ goals
- Read clouds.yaml and the ticket.
- Set project_name to shop.
- Do not change the user name.
@@ hints
- `cat ticket.txt` says the servers are in project shop.
- Edit the project_name line.
- `sed -i 's/project_name: sandbox/project_name: shop/' clouds.yaml`
@@ world
{"cwd": "/home/user/os"}
@@ file /home/user/os/ticket.txt
Servers web-1 and db-1 live in project shop. My list is empty.

@@ file /home/user/os/clouds.yaml
clouds:
  prod:
    auth:
      auth_url: https://keystone.example.com:5000/v3
      username: asha
      project_name: sandbox
      user_domain_name: Default
      project_domain_name: Default

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/os/clouds.yaml",
  "label": "project is shop",
  "re": "project_name:\\s*shop"
 },
 {
  "t": "contains",
  "path": "/home/user/os/clouds.yaml",
  "label": "user is unchanged",
  "re": "username:\\s*asha"
 }
]
@@ explain
A token is scoped to one project, and resource lists show only that project. An empty list is often the wrong scope rather than missing resources.
@@ solution
cat ticket.txt
cat clouds.yaml
sed -i 's/project_name: sandbox/project_name: shop/' clouds.yaml
cat clouds.yaml


## Complete the evacuation runbook
id: os-evacuate-runbook
module: openstack
level: Advanced
minutes: 10
lesson: openstack/operating-openstack-logs-upgrades-and-troubleshooting
engine: Simulated Linux shell with configuration files
summary: Add the missing safety step and the evacuate command to a failed-node runbook.
@@ story
compute-7 is dead. The runbook script lacks the step that powers the node off first, which risks two copies of a guest running at once, and it never evacuates. Add the fencing line and the evacuate command for compute-7.
@@ goals
- Read evacuate.sh.
- Add a line that powers the host off with ipmitool.
- Add nova host-evacuate for compute-7.
@@ hints
- Fencing first, then evacuation.
- ipmitool chassis power off.
- nova host-evacuate compute-7
@@ world
{"cwd": "/home/user/os"}
@@ file /home/user/os/evacuate.sh
#!/bin/sh
openstack compute service set --disable compute-7 nova-compute

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/os/evacuate.sh",
  "label": "the host is fenced",
  "re": "ipmitool.*power off"
 },
 {
  "t": "contains",
  "path": "/home/user/os/evacuate.sh",
  "label": "servers are evacuated",
  "re": "host-evacuate\\s+compute-7"
 }
]
@@ explain
If a host is only unreachable, its guests may still be writing to shared disks. Fencing makes sure they are stopped before the same guests are started elsewhere.
@@ solution
cat evacuate.sh
printf 'ipmitool -H bmc-compute-7 chassis power off\nnova host-evacuate compute-7\n' >> evacuate.sh
cat evacuate.sh

