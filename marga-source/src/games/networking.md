## Only some users can reach the site
module: networking
level: Intermediate
minutes: 6
lesson: networking/troubleshooting-toolkit
summary: After a migration, part of your users see errors. Work through DNS, the path and the firewall to find out why.
intro: You moved the shop to a new load balancer last night. This morning, support says that many customers see time-outs but others are fine. Your own laptop works.

### s1
text: Support sends three examples. Two are on mobile networks and one is on a home connection. All three report a very long wait, then an error. Your laptop is fine. What do you check first?
- Reproduce from your laptop and conclude it must be the customers' devices => end-fail | 0 | Customers are affected, and the pattern suggests something in the path or in DNS, not their devices. Example: Telling a customer 'it works on my laptop' ignores that 5 percent of users on IPv6 mobile networks time out for 30 seconds, while your office has only IPv4.
- Check what the name resolves to and test the connection on each protocol version => s2 | 2 | Differences between groups of users often come from DNS answers or IPv4 versus IPv6. Example: dig AAAA shop.example.com returns 2001:db8::10 and curl -6 times out while curl -4 answers in 40 ms, so the failure follows the protocol version.
- Restart the load balancer => s3 | 0 | A restart does not explain why only some users fail, and it may drop good connections. Example: Restarting the load balancer drops 2000 live connections and, since the IPv6 firewall rule is still missing, the same users fail again a minute later.

### s2
text: dig shows both A and AAAA records for shop.example.com. curl -4 works. curl -6 hangs and times out. Mobile networks often prefer IPv6. What does this mean?
- The IPv6 address does not accept connections, so IPv6-first users wait before falling back => s4 | 2 | That explains the long wait for some users and the normal service for others. Example: curl -6 -m 5 https://shop.example.com hangs at connect, while curl -4 returns 200, because the firewall only allows port 443 over IPv4.
- DNS is broken for everyone => s3 | 0 | DNS answers are correct. The difference is in the connection. Example: dig shop.example.com returns the same correct A and AAAA records from every resolver, so the names are fine and the path to the IPv6 address is not.
- The certificate is wrong => s3 | 0 | The failure is a timeout before TLS, not a certificate error. Example: A bad certificate gives an error such as certificate has expired after a quick handshake. A silent 30 second wait before any TLS is a connection problem.

### s3
text: You have not found the cause. Users are still affected. What is a sensible next test?
- Test the same URL with curl -4 and curl -6 and compare => s2 | 2 | A simple comparison separates the two paths. Example: curl -4 -w '%{http_code} %{time_total}' prints 200 0.04 and curl -6 prints 000 30.0, which separates the working path from the broken one.
- Wait to see if the problem goes away => end-fail | 0 | It will not go away by itself, and customers keep leaving. Example: Waiting changes nothing, because the firewall rule is still missing tomorrow, and each day customers on IPv6 phones abandon the checkout.

### s4
text: You find that the new load balancer has an IPv6 address, but its firewall rules only allow IPv4. You can fix the firewall, or remove the AAAA record. Which do you choose?
- Add the IPv6 rule to the firewall and test again with curl -6 => s5 | 2 | This keeps IPv6 working and fixes the cause. Example: ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT (or the matching cloud security group rule for ::/0) then curl -6 returns 200 in 50 ms.
- Delete the AAAA record to remove IPv6 quickly => s5 | 1 | It restores service fast, but cached records may persist for the TTL and IPv6 users lose a better path. Example: Removing the AAAA record works after the old answer expires, for example 300 seconds, but a resolver that cached it for an hour keeps sending users to the dead address.
- Open the firewall to all traffic => end-fail | 0 | Opening everything creates a serious security risk. Example: ufw default allow incoming fixes the symptom and exposes the database and admin ports to the internet, which will be found by scanners within hours.

### s5
text: After the change, curl -6 works from your test host. A few users still report problems. Why might this still happen?
- DNS caches may still hold old answers until the TTL expires, so check the record's TTL => s6 | 2 | Cached answers can last for the TTL. Example: If the AAAA record has a TTL of 3600, a user whose resolver cached the old answer at 10:00 keeps hitting the old address until 11:00, and dig +ttlunits shows the remaining time.
- The fix did not work and you must revert => s6 | 0 | The test shows it works. Cached data is a more likely cause. Example: Reverting a working fix because a few users still fail would bring the problem back for everyone, when the tests with curl -6 already show success.

### s6
text: The TTL is 3600 seconds, so most caches clear within an hour. How do you confirm that users are recovering?
- Watch error rates from both IPv4 and IPv6 test points, and ask support to confirm a few examples => end-win | 2 | You check the real result from the user's side on both paths. Example: Check the error graph split by IP version (for example 5xx per 1 minute for v4 and v6) and ask support for three tickets to retry, so you see the user's real result.
- Assume it is fixed => end-ok | 1 | Probably true, but you have not verified it. Example: 'curl -6 works' only proves your path. Some users still have cached answers or a different network, and without checking you will learn from the next complaint.

### end-win
end: win
text: Errors fall steadily as caches expire. The checklist for migrations now includes a test of both IPv4 and IPv6, and monitoring checks from an IPv6-only location.
takeaway: When only some users fail, compare paths: IPv4 and IPv6, resolvers, regions. Firewalls must be updated for IPv6 whenever an AAAA record exists.

### end-ok
end: ok
text: The fix was right, but without checking you cannot be sure every group of users is back.
takeaway: Verify from the user's side after a fix, and remember that DNS caching delays recovery.

### end-fail
end: fail
text: Customers kept timing out. Revenue dropped through the morning because the cause was never tested.
takeaway: Split the problem: names, paths, protocols. A pattern in who is affected is a clue.
