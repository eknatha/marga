## The VPN that drops at night
module: networking
level: Advanced
minutes: 7
lesson: networking/vpn-and-tunnels
summary: A site-to-site tunnel drops every night. Find the mismatch and make the link stable.
intro: Every night around 02:00 the link between the office and the cloud network goes down for several minutes. Backups that cross it fail.

### s1
text: The tunnel drops at about the same time each night. What do you check first?
- Compare the settings on both ends, especially key lifetimes and rekeying => s2 | 2 | A mismatch in lifetimes makes renegotiation fail at a regular interval. Example: One side rekeys every 8 hours and the other every 24, so after 8 hours the new keys are rejected.
- Replace the router => end-fail | 0 | Hardware replacement is expensive and unlikely to fix a setting mismatch. Example: The new router has the same default lifetime as the old one.
- Restart the tunnel every night => s2 | 1 | A restart hides the issue and still drops traffic during the restart. Example: A scheduled restart at 01:55 moves the outage but does not remove it.

### s2
text: What evidence would confirm a rekey problem?
- The tunnel logs near the drop time on both sides => s3 | 2 | The logs show negotiation failing at the same moment on both ends. Example: Both logs show a phase two negotiation timeout at 02:00:05.
- Only the monitoring graph of traffic => s3 | 1 | The graph shows when it dropped but not why. Example: Traffic falls to zero at 02:00, which confirms the time but not the cause.
- Nothing, just change settings => s3 | 0 | Changing settings without evidence can make things worse. Example: Setting random lifetimes may break the other side that currently works part of the day.

### s3
text: You find different lifetimes. What is the fix?
- Match the lifetimes on both ends and enable dead peer detection => s4 | 2 | Matching settings fix the cause, and detection helps recover quickly from future drops. Example: Both sides use 8 hours and dead peer detection brings the tunnel back within seconds if one side vanishes.
- Set the lifetime to zero on one side => s4 | 0 | Odd values can disable rekeying or be rejected, causing a bigger outage. Example: A zero lifetime is treated differently by each vendor and the tunnel fails at once.
- Open the firewall to all traffic => end-fail | 0 | A firewall change is unrelated and widens exposure. Example: Opening all ports does not help a failed key exchange.

### s4
text: How do you reduce the chance of a single tunnel failing again?
- Run a second tunnel with its own route and monitor the tunnel state => end-win | 2 | Redundancy and monitoring turn a failure into a short, visible event. Example: Two tunnels to different gateways fail over, and an alert fires when one is down.
- Rely on the single tunnel and a note in the wiki => end-fail | 0 | A single path remains a single point of failure. Example: The next maintenance on the gateway takes the whole link down.
- Add more bandwidth => end-ok | 1 | Bandwidth does not solve availability. Example: A bigger pipe still stops when the tunnel fails.

### end-win
end: win
text: The two ends now agree, the link is monitored and a second tunnel provides a path when one fails.
takeaway: Match both ends, watch the tunnel state and avoid a single path for important traffic.

### end-ok
end: ok
text: The nightly drop is fixed, but a single tunnel still leaves you exposed to the next failure.
takeaway: Remove the cause, then remove the single point of failure.

### end-fail
end: fail
text: The tunnel still drops, and the team has spent money and time without evidence.
takeaway: Read both ends logs before replacing anything.

## Uploads that hang on large files
module: networking
level: Intermediate
minutes: 6
lesson: networking/latency-mtu-and-network-performance
summary: Small requests work but large uploads stall. Find the path MTU problem.
intro: Users can open the site and fill forms, but uploading a photo hangs forever. It started after a VPN was added in front of the service.

### s1
text: Small requests work and large ones hang. What does that pattern suggest?
- A packet size problem such as MTU or blocked fragmentation messages => s2 | 2 | Small packets fit the path and large ones do not, which fits an MTU limit. Example: A ping with a large payload and the do-not-fragment flag fails while a small ping works.
- The server has too little CPU => s2 | 0 | CPU shortage would slow everything, not only large uploads. Example: Small requests are fast, so CPU is not the bottleneck.
- The upload form has a bug => s2 | 1 | Possible, but the timing with the VPN change points elsewhere. Example: The same form worked before the VPN.

### s2
text: How do you test for an MTU problem? Choose the move you would make next.
- Ping with increasing sizes and do-not-fragment set to find the largest that passes => s3 | 2 | This finds the real path limit. Example: ping -M do -s 1400 works but -s 1472 fails, so the path MTU is lower than 1500.
- Restart the browser => s3 | 0 | The browser is not the cause. Example: A restart does not change packet sizes.
- Test only from the server => s3 | 1 | You need a test along the same path users take. Example: A test on the server side of the tunnel may not cross the tunnel at all.

### s3
text: You find the path limit is about 1400 bytes. What is the fix?
- Lower the MTU or set MSS clamping on the tunnel interface => s4 | 2 | Clamping makes TCP choose segments that fit the path. Example: Setting the tunnel MTU to 1400 and clamping MSS to 1360 lets uploads pass.
- Raise the MTU everywhere to 9000 => end-fail | 0 | A higher MTU cannot pass through a path that only supports less. Example: Jumbo frames on the server do not help across a tunnel that supports 1400.
- Disable the VPN => s4 | 1 | It would remove the problem and also the protection it was added for. Example: Disabling it exposes traffic that the policy requires to be private.

### s4
text: How do you prevent the problem from coming back unnoticed?
- Test large transfers in the checks for network changes and monitor retransmissions => end-win | 2 | Tests with realistic payloads catch what simple pings miss. Example: A check that uploads a 5 MB test file through the tunnel after each change finds the fault at once.
- Rely on users to report it => end-fail | 0 | Users report late and often leave. Example: Customers abandon uploads before the first report arrives.
- Add a note to the wiki only => end-ok | 1 | Documentation helps but does not detect a regression. Example: The next tunnel change repeats the problem.

### end-win
end: win
text: Uploads pass again, the tunnel settings are documented and large-transfer tests run after every network change.
takeaway: Test with realistic payload sizes and set MTU or MSS on tunnels.

### end-ok
end: ok
text: Uploads work, but without a test the problem may return after the next network change.
takeaway: Add a check, not only a fix. Review the lesson and try the game again.

### end-fail
end: fail
text: Large transfers still stall and users keep leaving.
takeaway: Find the path limit before changing anything else.

