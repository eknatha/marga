## The name that points to the old server
module: networking
level: Intermediate
minutes: 7
lesson: networking/dns
summary: After a migration some users still reach the old server. Learn TTL, caches and how to check each layer.
intro: You moved the shop to new servers and changed the DNS record two hours ago. Some customers see the new site, others still land on the old one, and orders go to the wrong database.

### s1
text: Support says "it works for me, not for the customer". What do you check first?
- Ask the authoritative DNS server what it returns now, with dig @ns shop.example.com => s2 | 2 | Asking the authoritative server shows the truth, free of caches. Example: dig @ns1.example.com shop.example.com returns the new address 203.0.113.50.
- Assume the change failed and revert it => s2 | 0 | Reverting without evidence makes the split worse. Example: customers who just reached the new site are sent back to the old one.
- Clear your own browser cache => s2 | 1 | It helps only you. Example: your laptop sees the new site and the customers still do not.

### s2
text: The authoritative server returns the new address. Another resolver, 8.8.8.8, still returns the old one. What explains this?
- Resolvers cache the old answer until its TTL runs out => s3 | 2 | TTL is how long a cached answer may be reused. Example: the record had a TTL of 86400 seconds, so a resolver that cached it 20 hours ago will keep it for four more hours.
- DNS is broken on the internet => end-fail | 0 | DNS works as designed here. Example: the old answer is valid until its time is up.
- The new record has a typo => s3 | 1 | The authoritative answer is correct. Example: dig @ns1 shows the right address, so the record itself is fine.

### s3
text: You check the old TTL: 86400 seconds. Customers could see the old site for up to a day. What should you do now?
- Keep the old server serving correct data, or forward its orders to the new system, until caches expire => s4 | 2 | Both servers must give right answers during the overlap. Example: the old web server proxies requests to the new one, so customers on either address reach the same shop.
- Shut down the old server immediately => s4 | 0 | Customers with the cached address get errors. Example: half of the visitors see a connection timeout.
- Ask customers to flush their DNS => s4 | 1 | It works for a few people and does not scale. Example: only the customers who contact support are helped.

### s4
text: Orders were already written to the old database for two hours. What is the right step?
- Find those orders and move them to the new database, with a check for duplicates => s5 | 2 | Data created on the wrong side must be reconciled. Example: export orders since the switch from the old database and import those not present in the new one by order number.
- Ignore them, they are only a few => end-fail | 0 | Missing orders are lost revenue and angry customers. Example: customers paid and never get shipping emails.
- Replace the new database with the old one => s5 | 1 | It brings back old orders and loses the new ones. Example: orders placed on the new side vanish.

### s5
text: Everything is consistent. How do you prevent a repeat on the next migration?
- Lower the TTL to 60 seconds a day or two before the change, change the record, then raise it again later => end-win | 2 | A short TTL makes the switch fast. Example: with a 60 second TTL, most resolvers use the new address within a minute of the change.
- Never migrate again => end-fail | 0 | Migrations are normal. Example: infrastructure changes yearly.
- Change the TTL after the migration => end-ok | 1 | The old long TTL is already cached. Example: lowering it afterwards does not shorten the caches that exist.

### end-win
end: win
text: Both servers served correct data until caches expired. Orders were reconciled and the next migration will start with a lowered TTL.
takeaway: Lower the TTL before a DNS change, keep both sides correct during the overlap, and check the authoritative answer first.

### end-ok
end: ok
text: Most customers recovered, but some orders were handled late and by hand.
takeaway: The switch worked, and preparation would have made it painless.

### end-fail
end: fail
text: Customers saw errors or lost orders because the old side disappeared or the data was never reconciled.
takeaway: DNS changes are not instant. Plan for the overlap.

