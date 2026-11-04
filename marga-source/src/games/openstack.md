## The server that will not schedule
module: openstack
level: Intermediate
minutes: 7
lesson: openstack/compute-flavors-images-and-scheduling
summary: A server created in OpenStack goes to ERROR with "No valid host was found". Work out which check failed.
intro: A team creates app-9 with a large flavor. It goes straight to ERROR. The dashboard says the cloud has plenty of free capacity, so the team asks you to restart Nova.

### s1
text: What do you check first? Think about what the evidence shows.
- openstack server show for the fault, then compute service state and per-host free resources => s2 | 2 | The fault gives the error, and host data shows whether any node can hold the flavor. Example: fault: No valid host was found. openstack compute service list shows cmp-2 down and cmp-3 disabled.
- Restart all Nova services => s3 | 0 | It interrupts the cloud and does not explain the failure. Example: API calls fail for two minutes and the server still ends in ERROR.
- Retry the create ten times => s3 | 1 | The scheduler gives the same answer. Example: Ten ERROR servers now count against the project's quota.

### s2
text: Two compute nodes are unavailable and the rest have under 8 GB free each. The flavor needs 16 GB. What is the cause?
- No single node can hold the flavor, so the scheduler finds no valid host => s4 | 2 | Capacity is per node; free memory spread across many hosts cannot be added together. Example: cmp-1 has 6 GB free, cmp-4 has 7 GB free, but none has 16 GB.
- The image is corrupt => s3 | 0 | An image problem produces a different fault. Example: The same image boots on a smaller flavor.
- Keystone is down => s3 | 0 | Authentication works, since the create was accepted. Example: token issue succeeds.

### s3
text: What are sensible ways to get the server running?
- Bring back the down node, free space on one node by moving a server, or use a smaller flavor, and delete the ERROR servers => s4 | 2 | Each option either adds usable room or reduces the request. Example: Restoring cmp-2 adds 40 GB, and the create succeeds.
- Raise the memory overcommit ratio to 10 to 1 immediately => end-fail | 0 | Aggressive overcommit makes hosts run out of memory. Example: Hosts hit the OOM killer when guests fill their RAM.
- Tell the team the cloud is full => end-ok | 1 | It is not full; it is fragmented, and that diagnosis helps them. Example: The team buys capacity that was not needed.

### s4
text: How do you reduce this in future? Think about what the evidence shows.
- Alert on down compute services, track free memory per flavor class, and reserve large hosts in an aggregate => end-win | 2 | You see shortage before users do. Example: A dashboard shows the largest free slot per aggregate and alerts when it falls below the biggest flavor.
- Remove the large flavor => end-ok | 1 | It avoids the symptom and blocks real needs. Example: The database team cannot get the size they need.
- Ignore it; it happens rarely => end-fail | 0 | It will recur as the cloud fills. Example: The next team hits it during a release.

### end-win
end: win
text: The server is ACTIVE and the team has visibility of the largest free slot per class.
takeaway: Capacity is per node. Look at service state, free resources per host and the scheduler's reasons.

### end-ok
end: ok
text: The server runs, but fragmentation is still invisible.
takeaway: A fix without visibility returns.

### end-fail
end: fail
text: Hosts are overcommitted and failing under load.
takeaway: Settings cannot create RAM. Check the evidence before you act.


## SSH works from the office but not from home
module: openstack
level: Beginner
minutes: 7
lesson: openstack/neutron-networking-security-groups-and-floating-ips
summary: An engineer cannot SSH to a server that colleagues can reach. Work through the network layers from the inside out.
intro: The server bastion-1 is ACTIVE with a floating IP. Colleagues in the office can SSH to it. An engineer at home gets a connection timeout.

### s1
text: Where do you start? Think about what the evidence shows.
- Check the server state and console log, then the security group rules for port 22 and their allowed source ranges => s2 | 2 | A timeout from one location and success from another points to a source restriction. Example: openstack security group rule list bastion shows tcp 22 allowed only from 198.51.100.0/24.
- Recreate the server => s3 | 0 | The server is fine and a new one has the same rule. Example: The new server times out in the same way.
- Reboot the router => s3 | 1 | A shared router fault would affect the office too. Example: Colleagues are briefly disconnected and the engineer is still blocked.

### s2
text: The rule allows SSH only from the office range. The engineer's address is outside it. What is the right fix?
- Add a narrow rule for the engineer's address, or better use a VPN so access comes from the office range => s4 | 2 | Allow only what is needed, from only where it is needed. Example: openstack security group rule create --proto tcp --dst-port 22 --remote-ip 203.0.113.88/32 bastion.
- Allow 22 from 0.0.0.0/0 => s3 | 0 | It exposes SSH to the whole internet. Example: Within an hour the logs show thousands of password guesses.
- Disable the security group => s3 | 0 | That removes protection for every port. Example: All services on the server are reachable from anywhere.

### s3
text: After you add the rule, SSH still times out. What do you check next?
- That the floating IP is attached, the router is connected to the external network and the server's own firewall allows port 22 => s4 | 2 | Check each layer in order. Example: openstack floating ip list shows the address attached; ufw status on the console shows 22 allowed.
- Assume the rule did not apply and wait a day => end-fail | 0 | Rules apply within seconds. Example: A day is lost.
- Open every port => end-ok | 1 | It may work and creates serious exposure. Example: The server is scanned from the internet within minutes.

### s4
text: How do you make remote access safer and simpler in the long term?
- Put management access behind a VPN or bastion, keep rules narrow and review them regularly => end-win | 2 | There is one controlled path in. Example: Engineers connect to the VPN and the security group allows only the VPN range.
- Add every engineer's home address one by one => end-ok | 1 | It works, but home addresses change. Example: The rule list grows stale and confusing.
- Share one key and allow all addresses => end-fail | 0 | Shared keys and open access are a breach waiting to happen. Example: A former contractor still has the key.

### end-win
end: win
text: The engineer connects through the VPN and the rule stays narrow.
takeaway: Debug from the inside out, and keep management access narrow and controlled.

### end-ok
end: ok
text: It works, but rules keep growing with each person.
takeaway: Convenience rules become clutter and risk.

### end-fail
end: fail
text: SSH is open to the world and under attack.
takeaway: Fixing a timeout by opening everything trades a small problem for a large one.


