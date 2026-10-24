## Disk is full but df shows space
level: junior
An application on a Linux server fails to create files with "No space left on device". A colleague says the disk cannot be full because plenty of space is free.

```text
$ df -h /var
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3        50G   19G   29G  40% /var

$ df -i /var
Filesystem      Inodes   IUsed IFree IUse% Mounted on
/dev/sda3      3276800 3276800     0  100% /var
```
? What is the most likely cause?
+ The file system has run out of inodes, probably from a very large number of small files
- The disk is failing and reports the wrong size
- The application is writing to a read-only mount
- Swap space has been exhausted
why: The error appears when either blocks or inodes run out. Here blocks are 40% used but inodes are 100% used. Look for a directory with millions of tiny files, such as mail queues, session files or caches, with `find /var -xdev -type f | cut -d/ -f1-4 | sort | uniq -c | sort -rn | head`, and clean it up. Then add monitoring for inode use.

## Service fails with status 203
level: mid
A new systemd service never starts. The unit file was copied from another server.

```text
$ systemctl status report.service
Active: failed (Result: exit-code)
Process: 2210 ExecStart=/opt/report/run.sh (code=exited, status=203/EXEC)

$ ls -l /opt/report/run.sh
-rw-r--r-- 1 root root 214 Oct 22 09:12 /opt/report/run.sh
```
? What should you fix first?
+ Make the script executable and check that its first line names a valid interpreter
- Increase the restart limit in the unit file
- Open the firewall port for the service
- Reinstall systemd
why: Status 203/EXEC means systemd could not execute the command. The file mode has no execute bit, so `chmod 755 /opt/report/run.sh` is the first fix. If it still fails, check the shebang line (for example `#!/bin/bash`), line endings that came from another system, and that the interpreter exists.

## High load with an idle CPU
level: mid
Users say the server is slow. The load average is high, yet nothing seems to be using the CPU.

```text
$ uptime
 10:41:07 up 41 days, load average: 24.10, 22.87, 19.50

$ top -bn1 | head -4
%Cpu(s):  3.1 us,  1.2 sy,  0.0 ni, 10.4 id, 85.0 wa,  0.0 hi

$ iostat -x 1 2 | tail -3
Device   r/s    w/s   await  %util
sda     12.0  940.0  310.5  100.0
```
? What is the best next step?
+ Find which processes are generating the writes, for example with iotop or pidstat -d, because the disk is saturated
- Add more CPU cores
- Kill all processes with high memory use
- Reboot the server immediately
why: Load average counts processes waiting for I/O as well as CPU. 85% iowait with disk utilisation at 100% and a 310 ms await show the disk is the bottleneck. Identify the writer, then decide whether to throttle, move or fix it. Rebooting would hide the cause and lose the evidence.

## Process cannot bind to port 8080
level: junior
A service fails to start after a reboot with an error about its port.

```text
$ journalctl -u webapp -n 2
webapp: listen tcp :8080: bind: address already in use

$ ss -ltnp | grep 8080
LISTEN 0 128 *:8080 *:* users:(("python3",pid=912,fd=4))
```
? What should you do?
+ Find out what started the python3 process, and stop it or move one of the services to another port
- Run the service as root so that it can take the port
- Reboot again until it works
- Open port 8080 in the firewall
why: The error means another process already holds the port. ss -ltnp names it. Look at its command line and parent, for example with ps -fp 912 and systemctl status. The right fix is to remove the duplicate or give the services different ports. Root does not allow two programs to share a port.

## Cron job never runs
level: mid
A backup script works when run by hand. A cron entry was added, and no backup files appear.

```text
$ crontab -l
0 2 * * * backup.sh

$ grep CRON /var/log/syslog | tail -1
CRON[3012]: (root) CMD (backup.sh)
CRON[3012]: (CRON) info (No MTA installed, discarding output)
```
? What is the most likely cause?
+ Cron has a small PATH, so backup.sh is not found. Use the full path to the script and send the output to a log
- The system clock is wrong
- Cron cannot run at 2 AM
- The script needs a newer kernel
why: Cron runs jobs with a minimal environment, often only /usr/bin:/bin. Your shell finds the script because of your PATH or current directory. Use absolute paths, set PATH in the crontab, and redirect output, for example >> /var/log/backup.log 2>&1, so errors are visible.
