## The container that keeps restarting
module: docker
level: Intermediate
minutes: 6
lesson: docker/security-and-troubleshooting
summary: A new image keeps restarting every minute. Read the signs and find the real cause.
intro: A new version of the api container was released an hour ago. Since then the service is unstable. Monitoring shows the container restarting roughly once a minute.

### s1
text: docker ps shows the api container with status "Restarting (137)". Logs show normal startup lines and nothing wrong before each restart. What do you do first?
- Roll back to the previous image immediately => s2 | 1 | Rolling back restores service fast. It is a good safe step, but you should also learn the cause. Example: docker service update --rollback api, or deploying tag 1.4.2 again, brings back the old version in a minute while you look for what 1.5.0 changed.
- Look at the exit code and docker inspect for OOMKilled and limits => s3 | 2 | Code 137 means the process was killed, and inspect shows whether the memory limit was the cause. Example: docker inspect api --format '{{.State.OOMKilled}} {{.State.ExitCode}}' prints 'true 137', and HostConfig.Memory shows a 256 MB limit.
- Add more logging and redeploy => end-fail | 0 | New logging does not help when the process is killed by the system with no chance to log. Example: More log lines do not appear because the kernel sends SIGKILL, which a process cannot catch, so the last message is never written.

### s2
text: You rolled back and the service is stable again. The new version still needs to ship. What now?
- Inspect the failing container's state and limits to find the cause => s3 | 2 | Understand the problem so the next release works. Example: docker inspect shows OOMKilled true and a 256 MB limit, and docker stats shows the container at 255 MB, so the memory limit is what to examine.
- Re-deploy the new version unchanged tomorrow, hoping it works => end-fail | 0 | Nothing changed, so the same failure is certain. Example: Deploying 1.5.0 again at 09:00 tomorrow fails the same way at 09:12, once the cache grows to the limit, and you lose another day.

### s3
text: docker inspect shows OOMKilled true and a memory limit of 512 MB. docker stats before the kill showed memory at 508 MB. What does it mean?
- The application uses more memory than allowed and the kernel kills it => s4 | 2 | That is the meaning of OOMKilled with exit code 137. Example: dmesg shows 'Memory cgroup out of memory: Killed process 3921 (python)', and exit code 137 is 128 plus signal 9.
- Disk is full => end-fail | 0 | Disk problems do not produce OOMKilled. Example: A full disk gives 'no space left on device' errors in the log and df -h shows 100 percent, not OOMKilled true.
- The image is corrupt => end-fail | 0 | A corrupt image would fail to start at all. Example: A corrupt image fails at pull or at start with 'exec format error' or a layer error, but this container ran for 12 minutes first.

### s4
text: What changed in this release? The changelog says a new cache library was added. How do you confirm that the cache is responsible?
- Check the cache settings: it has no maximum size, so it grows without limit => s5 | 2 | An unbounded cache is a classic cause of steady memory growth. Example: cache = {} with no eviction stores every response, and memory climbs 20 MB per minute. A cache with maxsize=1000 (for example functools.lru_cache) stops that.
- Double the memory limit and move on => s5 | 1 | It may postpone the kill but does not remove the leak-like growth. Example: Raising the limit from 256 MB to 512 MB makes the kill happen after 24 minutes instead of 12, because the cache still grows without limit.

### s5
text: You set a maximum number of entries for the cache. What should you also do with the memory limit?
- Measure the memory use under realistic load, then set the limit with headroom => s6 | 2 | Limits should come from measurement, not guesses. Example: Run a load test, see that the service steadily uses 180 MB at peak, and set the limit to 256 MB, which leaves headroom without hiding leaks.
- Remove the memory limit entirely => end-fail | 0 | Without a limit one container can take down the host. Example: With no limit, one runaway container uses all 16 GB, the host starts swapping, and the database container on the same host is killed too.

### s6
text: The new image holds steady at 300 MB under load. How do you make sure you hear about this earlier next time?
- Alert when memory use approaches the limit and when restart counts rise => end-win | 2 | You will catch the next problem before users do. Example: An alert on container_memory_working_set_bytes above 85 percent of the limit and on restart count above 2 in 10 minutes pages you before customers see errors.
- Rely on the restart policy to hide it => end-ok | 1 | The service recovers, but the problem would stay invisible. Example: restart: always brings the container back in seconds, so graphs look fine, but every 12 minutes some requests fail and no one is told.

### end-win
end: win
text: The service is stable. The cache has a size limit, the memory limit is based on measurements, and alerts warn about memory and restarts.
takeaway: Read the exit code and inspect before changing anything. Code 137 with OOMKilled means a memory limit was hit. Bound caches and alert on memory.

### end-ok
end: ok
text: The service works, but a restart policy is hiding problems that will return as the data grows.
takeaway: A restart policy is not a fix. Alert on restarts.

### end-fail
end: fail
text: The service stayed unstable and the team repeated releases without finding the cause.
takeaway: The exit code and the container state tell you why it died. Look there first.
