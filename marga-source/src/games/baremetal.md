## The rack that went dark
module: baremetal
level: Intermediate
minutes: 7
lesson: baremetal/servers-racks-and-remote-management
summary: Four servers drop at once at noon. Work out whether it was power, cooling or software, and prevent a repeat.
intro: At 12:04 four servers in rack C7 stop answering. Monitoring shows nothing wrong with the applications. A colleague wants to restart the services on all four.

### s1
text: Four servers are gone at once. Where do you look first? Pick the step that is safest and gives you the most evidence.
- The BMC event logs and the rack power data, because the shared fault is likely power or cooling => s2 | 2 | One rack failing together points at something the servers share, and the BMC records power and temperature events. Example: ipmitool sel list on each server shows Power Supply AC lost at 12:04 on all four.
- The application logs on each server => s2 | 1 | Application logs may be missing if power was cut, and they do not explain a simultaneous loss. Example: The logs stop at 12:03 with no error, so they say nothing about the cause.
- Restart the services on all four => s2 | 0 | Servers that are off cannot run services, and you learn nothing about the cause. Example: The restart commands time out because the hosts are down.

### s2
text: The log says AC lost on power supply 1 and redundancy lost at the same second on all four. What does that mean?
- One power feed failed, and the second feed could not carry the rack either => s3 | 2 | Redundancy lost means a supply lost its input. The servers still went down, so the other feed also failed or tripped. Example: The PDU view shows feed A at 0 amps and feed B tripped at 12:04:12.
- A software bug rebooted them => s3 | 1 | Software would not log loss of AC power. Example: The kernel logs show no panic or reboot request.
- The BMC is broken => s3 | 0 | The BMC reported the events correctly. Example: The BMC clocks and sensors match the PDU data.

### s3
text: The rack draws 10 kW and each feed is rated 7 kW. What was the design fault?
- Each feed must be able to carry the whole rack alone, and here neither could => s4 | 2 | Redundant feeds only help if one feed can take the entire load. Example: Servers were added over the year without recalculating the load on a single feed.
- The servers should be moved to one feed only => s4 | 1 | Then a single failure would take all of them down. Example: A feed failure at 3 a.m. would stop every server in the rack.
- Nothing, power events are random => s4 | 0 | A predictable overload is a design fault, not bad luck. Example: The same rack trips again the next time one feed is serviced.

### s4
text: What do you change so this does not return? Pick the step that is safest and gives you the most evidence.
- Move servers until one feed can carry the load, and track a power budget per rack => end-win | 2 | A budget keeps future additions inside the safe limit. Example: A spreadsheet shows watts per feed and blocks new servers above 80 percent of one feed.
- Add a note to the wiki and carry on => end-ok | 1 | A note without a limit does not stop the next addition. Example: A new server is added the following month and the rack is overloaded again.
- Buy bigger servers => end-fail | 0 | Bigger servers draw more power. Example: The rack trips sooner.

### end-win
end: win
text: The servers are back, the rack has a power budget and one feed can carry everything.
takeaway: Redundancy works only when each side can carry the full load. Track power per rack.

### end-ok
end: ok
text: The servers are back, but the rack is still overloaded.
takeaway: Without a power budget the same fault returns the next time a feed is lost.

### end-fail
end: fail
text: The servers keep failing and nobody knows why.
takeaway: Guessing at software misses a shared hardware cause.


## The new server that never installs
module: baremetal
level: Intermediate
minutes: 7
lesson: baremetal/provisioning-pxe-dhcp-and-images
summary: A new server tries to PXE boot and stops. Follow the chain from DHCP to the installer.
intro: A new server in rack D2 boots the network card, then shows "No bootable device". Ten more are arriving tomorrow. A teammate wants to install each one from a USB stick.

### s1
text: Where do you start? Pick the step that is safest and gives you the most evidence.
- Watch the DHCP and TFTP log while the server boots, to see which step stops => s2 | 2 | The boot chain is DHCP, then file transfer, then loader, then installer, and the log shows how far it gets. Example: journalctl -u dnsmasq -f shows an offer to the MAC address, then no TFTP request.
- Replace the network card => s2 | 1 | A card that sends a DHCP request works, so the card is probably fine. Example: The new card behaves the same way.
- Install from USB on this one machine => s2 | 0 | It hides the problem and the next ten will fail too. Example: All ten new servers need a USB stick and a visit each.

### s2
text: There is an offer with next-server 10.20.9.9 but nothing else. What is wrong?
- The next-server address may not be the TFTP server, or the TFTP service is not reachable => s3 | 2 | The client gets an address but cannot fetch the boot file from the place it was told. Example: ping 10.20.9.9 fails because the real server is 10.20.1.5.
- The DHCP lease is too short => s3 | 1 | A short lease would not stop the file transfer. Example: Lease changes make no difference to the fetch.
- The disk is full => s3 | 0 | The server has not touched its disk yet. Example: A new disk would change nothing.

### s3
text: You correct next-server to the real TFTP host. The loader now downloads but the installer asks questions. What next?
- Check the kernel line for the answer file URL and that the web server serves it => s4 | 2 | An unattended install needs an answer file reachable at boot. Example: curl on the answer file URL returns 404 because of a typo in the path.
- Tell the team to click through the questions => s4 | 1 | That defeats automation and scales poorly. Example: Ten servers need ten manual sessions.
- Disable the firewall everywhere => s4 | 0 | A blanket change adds risk and may not be the cause. Example: Security alerts fire and the answer file path is still wrong.

### s4
text: After the fix, how do you stop an installed server from reinstalling on reboot?
- Make the disk first in the boot order and offer the installer only to machines marked for build => end-win | 2 | This avoids accidental wipes of running servers. Example: The provisioning tool flips the node to disk boot after a successful deploy.
- Leave network boot first => end-ok | 1 | A reboot could run the installer again. Example: A kernel update reboot wipes a node.
- Remove DHCP from the network => end-fail | 0 | New machines could not get an address at all. Example: The next server cannot even start the installer.

### end-win
end: win
text: All ten servers install by themselves and installed machines boot from disk.
takeaway: Debug the boot chain in order and mark machines for build.

### end-ok
end: ok
text: The servers install, but running machines could be offered the installer.
takeaway: Control which machines get the boot file.

### end-fail
end: fail
text: Each new server needs a person with a USB stick.
takeaway: Manual installs do not scale. Work from evidence and change one thing at a time.


## The array that was left degraded
module: baremetal
level: Advanced
minutes: 7
lesson: baremetal/disks-raid-firmware-and-burn-in
summary: An alert says a RAID 1 array is degraded. Replace the right disk before a second failure.
intro: At 03:10 an alert says /dev/md0 on db-4 is degraded. It holds the production database. The on-call engineer is tempted to wait until Monday.

### s1
text: What is the first thing to check? Pick the step that is safest and gives you the most evidence.
- mdadm --detail and smartctl, to see which disk failed and whether the other one is healthy => s2 | 2 | You need to know which member failed and the health of the survivor before you act. Example: mdadm shows sdb faulty; smartctl on sda says PASSED with no reallocated sectors.
- Reboot the server to clear the alert => s2 | 1 | A reboot does not repair a failed disk and adds risk. Example: The array comes back degraded again.
- Wait until Monday => s2 | 0 | The array has no redundancy until fixed. Example: A second disk fails on Sunday and the database is lost.

### s2
text: sdb is faulty and sda is healthy. What is the plan? Pick the step that is safest and gives you the most evidence.
- Take a fresh backup if one is not recent, then replace sdb and add the new disk => s3 | 2 | Backups first because rebuild stresses the survivor. Example: A snapshot is copied off the server before the swap.
- Pull sdb and put it back to see if it recovers => s3 | 1 | A kicked-out disk is not trustworthy and a reseat hides the problem. Example: The array drops sdb again within the hour.
- Add a spare to a different array => s3 | 0 | It does not help md0. Example: md0 remains degraded.

### s3
text: The replacement disk is in the bay. Which commands do you run?
- mdadm --fail and --remove on sdb if needed, then --add the new disk and watch the rebuild => s4 | 2 | These steps swap the member and start the resync. Example: mdadm /dev/md0 --add /dev/sdc starts a rebuild shown in /proc/mdstat.
- Format the new disk with ext4 and mount it => s4 | 1 | md needs the disk as a member, not a mounted filesystem. Example: The disk is busy and the array is still degraded.
- Run mdadm --create over the old array => s4 | 0 | That would destroy the array and its data. Example: All data on md0 is lost.

### s4
text: How do you stop this alert becoming an outage next time? Pick the step that is safest and gives you the most evidence.
- Alert on degraded arrays, keep spares on site, use SMART monitoring and plan RAID 6 or 10 for large disks => end-win | 2 | Fast detection and spare parts shorten the time without redundancy. Example: smartd sends a ticket when reallocated sectors rise, and a spare disk is in the cabinet.
- Rely on someone noticing => end-ok | 1 | Humans miss alerts. Example: The next degraded array runs for three weeks unseen.
- Stop using RAID => end-fail | 0 | Then any disk failure loses data. Example: A single disk failure takes the service down.

### end-win
end: win
text: The array is clean again, the disk was replaced within hours and alerts catch the next fault.
takeaway: A degraded array is an incident until the rebuild finishes.

### end-ok
end: ok
text: The array is rebuilt, but nothing would catch the next failure sooner.
takeaway: Monitoring and spares are part of the fix.

### end-fail
end: fail
text: The array failed completely while degraded. Nobody is sure what to fix next.
takeaway: Waiting turns one failure into data loss.


## The firmware update that bricked the BMCs
module: baremetal
level: Advanced
minutes: 7
lesson: baremetal/operating-a-fleet-failures-lifecycle-and-capacity
summary: Plan a firmware update for 120 servers so a bad update cannot take the fleet out of reach.
intro: A security notice says all 120 servers need a BMC and BIOS update this week. The vendor tool can push the update to every host at once.

### s1
text: How do you start the rollout? Pick the step that is safest and gives you the most evidence.
- Read the release notes, test on spare machines, then update one canary in production => s2 | 2 | Notes may list required intermediate versions, and a canary shows real behaviour. Example: The notes say BMC versions older than 2.50 need 2.60 first.
- Push to all 120 now to meet the deadline => s2 | 1 | A bad update would hit everything at once. Example: Thirty BMCs hang and need a visit to the datacentre.
- Skip the update => s2 | 0 | The security risk stays open. Example: The notice deadline passes with the fleet unpatched.

### s2
text: The canary is healthy. What is the wave plan? Pick the step that is safest and gives you the most evidence.
- Small waves of five to ten, checking health and logs before each next wave => s3 | 2 | Small waves limit the blast radius and give time to stop. Example: After each wave, ipmitool and the monitoring dashboard are checked.
- Update everything over the weekend with no checks => s3 | 1 | Without checks you will not see a failure until it spreads. Example: By Monday forty servers are unreachable.
- Update only the busiest servers first => s3 | 0 | Busy servers hold the most risk if the update fails. Example: A failure takes down the most important machines.

### s3
text: Three servers in the first wave do not return. What do you do?
- Stop the rollout, use the BMC or console to investigate, and fix the cause before continuing => s4 | 2 | Stopping keeps the damage small. Example: One server has an old BMC that needed the intermediate version.
- Continue so the schedule holds => s4 | 1 | More servers would fail the same way. Example: Twenty more servers need rescue.
- Roll back every server => s4 | 0 | Rolling back healthy machines adds risk without need. Example: Healthy servers go through a second, needless update.

### s4
text: What do you change in the process afterwards? Pick the step that is safest and gives you the most evidence.
- Record version requirements, add pre-checks for BMC versions and keep a rollback and out-of-band access plan => end-win | 2 | Checks and plans prevent the same surprise. Example: A script refuses to update hosts below the minimum version.
- Nothing, it was bad luck => end-ok | 1 | The cause was knowable from the notes. Example: The next update repeats the problem.
- Never update firmware again => end-fail | 0 | Unpatched firmware is a security and stability risk. Example: A known bug is exploited a year later.

### end-win
end: win
text: The fleet is patched, the process has checks and nothing was lost.
takeaway: Stage firmware updates and read the notes.

### end-ok
end: ok
text: The fleet is patched, but only after avoidable pain.
takeaway: A canary and pre-checks are cheap insurance.

### end-fail
end: fail
text: Dozens of servers are unreachable. Nobody is sure what to fix next.
takeaway: Updating everything at once puts all your machines at risk together.


