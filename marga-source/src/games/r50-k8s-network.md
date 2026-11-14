## Random timeouts
module: k8s-network
level: Advanced
minutes: 7
lesson: k8s-network/debugging-kubernetes-networking
summary: Some requests to a Service fail at random. Find the failing hop in order.
intro: After a traffic spike, about one request in twenty to the orders Service times out. Dashboards show the pods are healthy.

### s1
text: What do you check first? Choose the best next step.
- Whether the failure is DNS, the Service or the pod, by testing each from a pod => s2 | 2 | Testing hop by hop narrows the cause. Example: A pod IP request always works while the Service name sometimes fails.
- Scale the orders pods to double => s2 | 1 | It may not touch the cause. Example: The failure rate stays the same.
- Restart all nodes => end-fail | 0 | Disruptive and unfocused. Example: The failures return after the restart.

### s2
text: The pod IP works and the Service address sometimes fails. What next?
- Check the node: kube-proxy rules, conntrack usage and kernel messages => s3 | 2 | The Service path depends on node rules and connection tracking. Example: The kernel log says the conntrack table is full.
- Rewrite the application timeouts => s3 | 1 | It hides the failure. Example: Slower failures with the same cause.
- Delete the Service and recreate it => end-fail | 0 | It may lose the stable address. Example: Clients with cached addresses break.

### s3
text: The conntrack table is full. What is the right fix?
- Raise the limit and reduce short lived connections such as DNS with a node cache => s4 | 2 | Fix capacity and the source of load. Example: Entries fall by seventy percent after NodeLocal DNSCache.
- Disable conntrack for all traffic => s4 | 1 | It breaks NAT and stateful rules. Example: Services stop working at all.
- Ignore it because it is intermittent => end-fail | 0 | It will worsen with growth. Example: The next spike makes it an outage.

### s4
text: How do you prevent a repeat? Choose the best next step.
- Alert on conntrack usage and DNS latency and load test with realistic connection counts => end-win | 2 | Alerts catch it early. Example: An alert at seventy percent leaves time to act.
- Rely on user complaints => end-ok | 1 | It is too late. Example: Customers find the problem first.
- Add more pods only => end-fail | 0 | It does not touch the limit. Example: The node still runs out of entries.

### end-win
end: win
text: Failures stopped but only after a heavy handed change.
takeaway: Follow the order and change one thing at a time. Review the lesson and try again.

### end-ok
end: ok
text: Failures stopped, the table limit was raised and DNS caching reduced the load.
takeaway: Test each hop in order and look at the node when the pod and the name both work.

### end-fail
end: fail
text: Random changes made the outage longer and hid the cause.
takeaway: Work from the symptom down. Review the lesson and try again.
