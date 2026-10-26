## The container that keeps restarting
module: docker
level: Intermediate
minutes: 6
lesson: docker/security-and-troubleshooting
summary: A new image keeps restarting every minute. Read the signs and find the real cause.
intro: A new version of the api container was released an hour ago. Since then the service is unstable. Monitoring shows the container restarting roughly once a minute.

### s1
text: docker ps shows the api container with status "Restarting (137)". Logs show normal startup lines and nothing wrong before each restart. What do you do first?
- Roll back to the previous image immediately => s2 | 1 | Rolling back restores service fast. It is a good safe step, but you should also learn the cause.
- Look at the exit code and docker inspect for OOMKilled and limits => s3 | 2 | Code 137 means the process was killed, and inspect shows whether the memory limit was the cause.
- Add more logging and redeploy => end-fail | 0 | New logging does not help when the process is killed by the system with no chance to log.

### s2
text: You rolled back and the service is stable again. The new version still needs to ship. What now?
- Inspect the failing container's state and limits to find the cause => s3 | 2 | Understand the problem so the next release works.
- Re-deploy the new version unchanged tomorrow, hoping it works => end-fail | 0 | Nothing changed, so the same failure is certain.

### s3
text: docker inspect shows OOMKilled true and a memory limit of 512 MB. docker stats before the kill showed memory at 508 MB. What does it mean?
- The application uses more memory than allowed and the kernel kills it => s4 | 2 | That is the meaning of OOMKilled with exit code 137.
- Disk is full => end-fail | 0 | Disk problems do not produce OOMKilled.
- The image is corrupt => end-fail | 0 | A corrupt image would fail to start at all.

### s4
text: What changed in this release? The changelog says a new cache library was added. How do you confirm that the cache is responsible?
- Check the cache settings: it has no maximum size, so it grows without limit => s5 | 2 | An unbounded cache is a classic cause of steady memory growth.
- Double the memory limit and move on => s5 | 1 | It may postpone the kill but does not remove the leak-like growth.

### s5
text: You set a maximum number of entries for the cache. What should you also do with the memory limit?
- Measure the memory use under realistic load, then set the limit with headroom => s6 | 2 | Limits should come from measurement, not guesses.
- Remove the memory limit entirely => end-fail | 0 | Without a limit one container can take down the host.

### s6
text: The new image holds steady at 300 MB under load. How do you make sure you hear about this earlier next time?
- Alert when memory use approaches the limit and when restart counts rise => end-win | 2 | You will catch the next problem before users do.
- Rely on the restart policy to hide it => end-ok | 1 | The service recovers, but the problem would stay invisible.

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
