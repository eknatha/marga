## The inventory with the wrong hosts
module: ansible
level: Intermediate
minutes: 7
lesson: ansible/ansible-at-scale
summary: A playbook runs against the wrong group of servers. Learn limit, check mode, inventory hygiene and staged rollouts.
intro: You run a playbook to restart a database service, intended for the staging group. It runs on all hosts because a group was defined twice in the inventory.

### s1
text: You notice that the play output lists production hosts. What do you do?
- Stop the run (Ctrl+C) and assess which hosts were changed => s2 | 2 | Stop further damage, then check. Example: the output shows 4 of 30 hosts already restarted, all in production.
- Let it finish, it is only a restart => s2 | 0 | A restart in production can cause an outage. Example: the primary database restarts during peak.
- Close the terminal => s2 | 1 | The play may continue on the remote side for running tasks. Example: tasks still finish on some hosts.

### s2
text: Four production hosts restarted. What next?
- Check service health on those hosts and the application impact, and tell the on-call team => s3 | 2 | Impact comes first. Example: one replica is behind and the application saw 40 seconds of errors.
- Hide it and hope => end-fail | 0 | Others may spend hours finding a cause. Example: the on-call investigates a mystery.
- Re-run the playbook to fix => s3 | 1 | It repeats the mistake. Example: more hosts restart.

### s3
text: The restart is stopped, and you need to understand how production hosts were included in a run meant for staging only. How did all hosts get included?
- Check the inventory and the --limit used: a group name appeared twice, and no limit was set => s4 | 2 | ansible-inventory --graph shows the real structure. Example: the group "db" included both staging and production hosts.
- Ansible is unreliable => s4 | 0 | Ansible did what the inventory said. Example: the inventory was wrong.
- Someone hacked it => s4 | 1 | A simple inventory mistake is far more likely. Example: the history shows a merge.

### s4
text: What do you change in the way you run playbooks?
- Use --limit, run --check and --diff first, and confirm targets with --list-hosts => s5 | 2 | Look before you change. Example: ansible-playbook site.yml --limit staging --list-hosts prints the exact hosts.
- Run only at night => s5 | 1 | Timing does not fix targeting. Example: the wrong hosts restart at night.
- Use one big inventory with no structure => end-fail | 0 | It increases mistakes. Example: no clear boundary between environments.

### s5
text: How do you make production changes safer in the long run?
- Separate inventories per environment, serial rollouts in small batches, and a review step for production => end-win | 2 | Structure limits the blast radius. Example: serial: 2 restarts two hosts at a time, and max_fail_percentage stops the run if hosts fail.
- Rely on careful typing => end-ok | 1 | Humans make errors. Example: a typo targets the wrong group.
- Avoid automation => end-fail | 0 | Manual work is slower and no safer. Example: hand edits produce drift.

### end-win
end: win
text: Impact was limited to four hosts, inventories are separated per environment, and plays roll out in small batches with checks first.
takeaway: Know exactly what a play will touch: list hosts, check first, limit scope and roll out in batches.

### end-ok
end: ok
text: The mistake was contained, though the process is only partly improved.
takeaway: Separate inventories and use serial rollouts.

### end-fail
end: fail
text: The run continued across production or was hidden, causing a larger outage.
takeaway: Stop, assess and tell people. Hiding makes it worse.

