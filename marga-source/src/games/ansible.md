## The playbook that took down checkout
module: ansible
level: Advanced
minutes: 6
lesson: ansible/ansible-at-scale
summary: A library upgrade must reach 240 web servers during a busy afternoon. Decide how to roll it out.
intro: Marketing has a sale tonight. A security fix for a shared library must reach all 240 web servers today. Your playbook works on staging and takes four minutes to run on all hosts at once.

### s1
text: The playbook has no serial setting. What do you do before running it?
- Run it on all hosts now, since staging was fine => end-fail | 0 | If the new library has a startup bug, all 240 servers fail together and checkout goes down. Example: One run on all 240 hosts with a broken library version takes the whole checkout down in four minutes, with nobody left to take traffic.
- Add serial, a canary batch and a health check, then test with check mode on one host => s2 | 2 | A small first batch limits damage and gives you evidence. Example: serial: [2, '20%'] with a uri task checking /health and --check --diff on one host first catches a bad change on two servers, not 240.
- Run it only after midnight with no changes => s3 | 1 | Timing helps, but the lack of batches and health checks is still the real risk. Example: Running at 02:00 is calmer, but the same bad package still lands on all hosts at once, only with fewer customers watching.

### s2
text: You add serial 2 for the first batch, then 20 percent, and max_fail_percentage 10. What should happen between batches?
- Drain the host from the load balancer, update, wait for the health endpoint, and put it back => s4 | 2 | Waiting on real readiness prevents sending users to a broken host. Example: The tasks use a load balancer module to drain host web-17, update the package, wait_for the port and then uri on /health until status 200, and then enable the host again.
- Sleep 30 seconds and continue => s4 | 0 | A fixed sleep guesses at readiness and passes broken hosts. Example: pause: seconds=30 passes a host whose service needs 45 seconds to start, so users are sent to a server that returns 503.
- Nothing, the batches are enough => s4 | 1 | Batches help, but without checks bad hosts keep taking traffic. Example: With serial: 2 but no health task, a bad host is put back in the pool, and the next batch only starts after the first has already spread the fault.

### s3
text: The run is delayed but unchanged. At midnight a colleague asks why it still touches every host at once. What do you do?
- Rework it with serial, health checks and a canary before running => s2 | 2 | Good, change the design rather than just the clock. Example: Rewriting the play with serial, a canary group and a health check before the run is cheaper than recovering 240 hosts afterwards.
- Run it anyway, the traffic is lower => end-fail | 0 | Lower traffic does not make a total outage acceptable. Example: Running anyway at 22:00 'because traffic is low' still turns an outage into a lost evening for 15,000 customers.

### s4
text: The canary batch finishes and the second host reports a failed health check. The play stops. What now?
- Investigate the failing host with ssh and logs, fix the cause, and re-run on that batch with --limit => s5 | 2 | The stop rule worked. Fix the cause before continuing. Example: ssh to web-03, read journalctl -u app, see 'missing LIBRARY_MODE', fix it, and run ansible-playbook site.yml --limit batch2 to continue where it stopped.
- Remove max_fail_percentage and rerun to push through => end-fail | 0 | You would deploy the bug fleet-wide. Example: Setting max_fail_percentage to 100 lets the play continue after a failing host, so the bad change reaches all remaining servers.
- Add ignore_errors to the health task => end-fail | 0 | That hides the exact signal that protected you. Example: ignore_errors: true on the health check turns a stop signal into a green line, and the broken service is rolled out everywhere.

### s5
text: The cause was a missing configuration variable for the new version on hosts in one group. How do you finish?
- Add the variable in group_vars, add an assert for it, rerun the canary, then continue the waves => s6 | 2 | The assert makes the same mistake fail early next time. Example: group_vars/web.yml gets library_mode: standard, and a task 'assert: that: library_mode is defined' fails early on any host that lacks the value.
- Patch the file on the failing hosts by hand => s6 | 0 | Manual fixes drift and will be overwritten or forgotten. Example: Editing /etc/app/app.conf on three hosts by hand fixes today, but the next run of the playbook overwrites it, and the fix is gone.

### s6
text: All batches succeeded. What is the last step before closing the change?
- Run the playbook again to confirm changed=0 and check the error rate on the dashboard => end-win | 2 | A clean second run and real traffic metrics confirm the fleet matches the description. Example: A second run with changed=0 shows the hosts match the playbook, and error rate under 0.1 percent for 30 minutes shows users are fine.
- Close it, the recap was green => end-ok | 1 | Probably fine, but one extra check is cheap. Example: Closing at once misses a host that silently skipped a task because of a failed when: condition, which a second run would show as changed.

### end-win
end: win
text: The fleet is patched without a single failed checkout. The canary and health check caught a real problem on two hosts before customers saw it.
takeaway: Roll out in batches, wait on health, stop on failure, and prove the result with a clean second run.

### end-ok
end: ok
text: The change shipped, but you relied on the recap alone. Nothing broke this time.
takeaway: Add a metric check after the final wave. A green recap does not show user impact.

### end-fail
end: fail
text: Checkout went down across the fleet at the worst possible moment. Rolling back took longer than the original change.
takeaway: Never change every host at once. Batch, check health and set a stop rule before you start.
