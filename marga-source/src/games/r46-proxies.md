## The 502s after the midnight deploy
module: proxies
level: Intermediate
minutes: 7
lesson: proxies/debugging-502-504-and-proxy-problems
summary: Users get 502 errors right after a deploy. Find the cause from the proxy log and recover without making it worse.
intro: It is 00:20. A deploy finished ten minutes ago and the support channel shows customers seeing 502 Bad Gateway. The proxy is nginx in front of three app containers, and nobody has touched the proxy itself.

### s1
text: Customers report 502 errors on every page since the deploy. What do you check first?
- Read the proxy error log for the upstream error text => s2 | 2 | The error log names the upstream address and the exact failure, which separates a refused connection from a timeout. Example: tail -n 20 /var/log/nginx/error.log shows connect() failed (111: Connection refused) while connecting to upstream, upstream: http://10.0.2.14:8080.
- Restart nginx at once because it is the thing showing the error => s3 | 0 | Restarting the proxy rarely fixes an upstream problem and loses the evidence. Example: After the restart the 502 count stays at 40 per second because the app containers are still not listening on 8080.
- Increase the proxy timeouts to give the app more time => s3 | 0 | A refused connection is not a timeout, so longer timers change nothing. Example: Setting proxy_read_timeout 300s leaves 502 unchanged because the error is connect() failed, which happens in milliseconds.

### s2
text: The log says connection refused for all three upstream addresses. What does that tell you?
- The app processes are not listening on the port, so look at the containers rather than the proxy => s4 | 2 | Connection refused means nothing accepted the connection on that port. Example: ss -ltn on an app host shows no listener on 8080, and the container status shows Restarting (1) 12 seconds ago.
- The certificate has expired => end-fail | 0 | A certificate problem would show a TLS error on the client side, not connect() refused to the upstream. Example: Renewing the certificate changes nothing, and customers still see 502 because the proxy to app hop is the one failing.
- The proxy cache is corrupted => s3 | 0 | A cache problem returns stale or wrong pages, not 502. Example: Clearing /var/cache/nginx leaves the 502s unchanged since the proxy never reaches an app to cache.

### s3
text: You lost some minutes and the errors continue. What is the next sensible step?
- Return to the error log and read the exact upstream error before changing anything => s2 | 2 | Evidence first, then action. Example: grep upstream /var/log/nginx/error.log | tail shows the same refused connection on 10.0.2.14, 10.0.2.15 and 10.0.2.16.
- Roll back the proxy configuration => end-fail | 0 | The proxy configuration did not change, so rolling it back repeats the guess. Example: The previous nginx.conf is identical apart from a comment, and the 502 rate stays the same.

### s4
text: The containers crash a few seconds after starting. What do you look at?
- The container logs for the startup error => s5 | 2 | The app logs state why it exits. Example: docker logs app-1 shows KeyError: DATABASE_URL, a variable the new release needs but the deployment did not set.
- The proxy access log for slow requests => s3 | 0 | The access log shows the 502s but not why the app dies. Example: The access log lists thousands of 502 lines with 0.001 second timings and says nothing about the missing variable.

### s5
text: The cause is a missing environment variable in the new release. Traffic is still failing. How do you restore service fastest and safely?
- Roll the deployment back to the previous release, then fix the variable and redeploy with a health check => end-win | 2 | A rollback restores service quickly and the health check stops the same mistake from reaching users. Example: kubectl rollout undo brings back the old image in 40 seconds, the 502 rate drops to zero, and the fix ships later with a readiness probe on /health.
- Set the variable by hand on one host and leave the others failing => end-ok | 1 | It restores part of the service but leaves most hosts down and hides the process problem. Example: Host 1 recovers while hosts 2 and 3 keep returning 502, and the next deploy fails the same way.
- Disable the health check so the proxy keeps sending traffic => end-fail | 0 | Traffic to a crashing app only produces more errors. Example: With health checks off, every request is sent to a restarting container and the error rate rises to 100 percent.

### end-win
end: win
text: Customers are served again within a minute, the cause is fixed, and a readiness check now blocks a repeat.
takeaway: Roll back first, read the evidence, and add checks that stop a bad release from taking traffic.

### end-ok
end: ok
text: Service is back on part of the fleet, but the process gap remains.
takeaway: Restoring service is only half the job; fix the release process too.

### end-fail
end: fail
text: The errors continue or get worse and customers keep seeing failures.
takeaway: Do not guess at the proxy; read the upstream error and fix the app that is down.
