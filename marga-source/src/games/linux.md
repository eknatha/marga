## The server that slowed to a crawl
module: linux
level: Intermediate
minutes: 6
lesson: linux/performance-triage
summary: A production web server gets slower every hour. Find out why using the right commands in the right order.
intro: It is 14:00 and you are on call. Customers report that the order site is very slow. The web server web-03 still answers, but pages take ten seconds. You have a shell on the machine.

### s1
text: Monitoring shows a rising response time on web-03 since 12:30. Other web servers are normal. You log in over SSH. What is your first move?
- Reboot the server straight away => s3 | 0 | A reboot may hide the cause and drops all current customers. You also lose the evidence in memory and process lists.
- Run uptime, then top, to see load and which process is busy => s2 | 2 | Load average and the process list are the quickest way to see whether CPU, memory or waiting is involved.
- Restart the web application => s4 | 1 | It may help for a while, but you have not learned what is wrong, and it may return.

### s2
text: uptime shows a load average of 14 on a 4-core machine. top shows CPU mostly idle, but the %wa (waiting for input and output) value is above 70 percent. A java process is at the top of the list. What does this tell you?
- The CPU is too slow, so ask for a bigger server => s5 | 0 | The CPU is mostly idle. High load with high I/O wait means processes are blocked waiting for disk or similar, not short of CPU.
- Processes are waiting on disk, so check disk usage and disk activity => s6 | 2 | Correct. High wait time points at storage. df and iostat are the next tools.
- Kill the java process => s4 | 0 | Killing the main application causes an outage and does not explain why it was waiting.

### s3
text: You rebooted web-03. It came back, customers reconnected, and the site was fast for ten minutes. Now it is slow again, and the evidence from before the reboot is gone. What now?
- Reboot again => end-fail | 0 | Rebooting a second time repeats the same mistake and creates more downtime. The cause is still there.
- Start with uptime and top, as you should have done first => s2 | 2 | Good. You are back to collecting facts. Next time, collect evidence before restarting anything.

### s4
text: The restart helped for a few minutes. Then the page times rise again. You still do not know the cause. You decide to look properly. What do you check?
- Run top and uptime => s2 | 2 | Look at load, CPU and waiting time to find the kind of bottleneck.
- Change the web server settings at random => end-fail | 0 | Random changes can make things worse and hide the real cause.

### s5
text: A colleague agrees to order a larger server, but it will take two days. Meanwhile customers are still waiting. You check again and notice the wait percentage is still very high. What do you do?
- Look at disk space and disk activity => s6 | 2 | The data points to storage, so look there before buying hardware.
- Wait for the new server => end-fail | 0 | Customers suffer for two days, and a bigger CPU may not fix a disk problem.

### s6
text: df -h shows the root filesystem is only 62 percent full. iostat -x shows the data disk at 100 percent utilisation with long waits. iotop shows a backup job reading the whole database directory. The job started at 12:30. What do you do?
- Stop the backup job now, and tell the team so it can be rescheduled with limits => s7 | 2 | The backup competes with customers for disk. Stopping it restores service quickly, and you should fix the schedule and add a limit.
- Delete old files to free disk space => end-fail | 0 | Disk space is not the problem. Deleting files is risky and does not reduce the activity.
- Lower the backup's priority with ionice and watch => s7 | 1 | This can help without stopping the backup, but if the disk stays saturated you may still need to pause it.

### s7
text: The page times fall back to normal within a minute. You now have time to prevent a repeat. What do you do before closing the incident?
- Note the cause, move the backup to a quiet time or a replica, limit its speed, and add an alert on disk wait => end-win | 2 | You fixed the cause, not just the symptom, and added detection.
- Close the incident and move on => end-ok | 1 | Service is back, but the backup will run again at the same time tomorrow.

### end-win
end: win
text: Web-03 is fast again. The backup now runs from a replica at night with a speed limit, and an alert warns when disk wait rises. Customers hardly noticed.
takeaway: Look at load, CPU, memory and disk wait before changing anything. High load with idle CPU usually means processes are waiting for something such as disk.

### end-ok
end: ok
text: The site recovered, but the cause was not removed. The backup will start again tomorrow at 12:30 and the same slowdown will return.
takeaway: Recovery is only half the job. Remove or limit the cause, and add an alert so you hear about it before customers do.

### end-fail
end: fail
text: The slowdown continued for hours. Customers abandoned their orders and the team lost time on actions that did not address the cause.
takeaway: Do not restart or change things before you have evidence. A few commands, uptime, top, df and iostat, usually point to the cause in minutes.
