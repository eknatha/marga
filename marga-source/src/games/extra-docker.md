## The container that lost its data
module: docker
level: Beginner
minutes: 5
lesson: docker/volumes-and-networking
summary: A database container was replaced during an update and its data disappeared. Learn where data should live.
intro: You updated a database container to a new image. When it started again, the tables were empty.

### s1
text: The data is gone after replacing the container. What is the likely reason?
- The data lived in the container writable layer, which is removed with the container => s2 | 2 | Without a volume, data is part of the disposable container. Example: docker rm deletes the writable layer, including anything the database wrote there.
- The new image has a bug that deletes data => s2 | 1 | Possible, but the common cause is storing data inside the container. Example: The image only started the database and found an empty data directory.
- Docker lost the disk => s2 | 0 | Docker did not lose a disk; the data was never on a separate one. Example: The host disk is healthy.

### s2
text: Can you recover the data? Choose the move you would make next.
- Check if the old container or a volume still exists and restore from backup if not => s3 | 2 | Look for any surviving copy before declaring it lost, then use the backup. Example: docker ps -a and docker volume ls show whether an old container or volume remains.
- Start from scratch and tell nobody => end-fail | 0 | Hiding data loss makes it worse. Example: Users find missing orders later.
- Run docker system prune to clean up => s3 | 0 | Prune can remove the last copy. Example: docker system prune -a --volumes deletes unused volumes, including the one you need.

### s3
text: What is the right design? Choose the move you would make next.
- Mount a named volume at the data directory and back it up => s4 | 2 | A volume outlives the container and can be backed up. Example: docker run -v dbdata:/var/lib/postgresql/data keeps data across replacements.
- Use a bind mount to any random path => s4 | 1 | Bind mounts work but depend on the host and need care with permissions. Example: A path missing on the new host leaves the container with an empty directory.
- Keep data inside the container and snapshot it => s4 | 0 | Snapshots of a container are not a reliable backup. Example: Committing the container to an image is large, slow and easy to forget.

### s4
text: How do you check the safety of the next update?
- Restore a backup into a test container and verify the data before updating => end-win | 2 | A tested restore proves the data is recoverable. Example: Restoring into a temporary container and running a row count shows the backup works.
- Update in production and watch => end-fail | 0 | Risky without a tested recovery path. Example: The same loss happens again.
- Rely on the image tag staying the same => end-ok | 1 | Tags do not protect data. Example: The tag is the same but the data location is not.

### end-win
end: win
text: Data lives in a volume with a tested backup, so replacing the container is a routine act.
takeaway: Treat containers as disposable and data as separate.

### end-ok
end: ok
text: Data is recovered, but the next update still carries risk without a tested restore.
takeaway: Test the restore. Review the lesson and try the game again.

### end-fail
end: fail
text: The data is gone and the cause is still in place.
takeaway: Separate data from containers before any update.

## The service that started before its database
module: docker
level: Intermediate
minutes: 5
lesson: docker/compose
summary: An app crashes at startup because its database is not ready. Fix the race in a Compose stack.
intro: After a power cut, the whole stack restarts. The web container exits with connection refused and keeps restarting.

### s1
text: The app exits because the database is not accepting connections yet. What is wrong?
- Started is not the same as ready: the app began before the database was ready => s2 | 2 | A container can be running long before the service inside accepts connections. Example: The database needs 10 seconds to recover, but the app tries at second 2.
- The network is broken => s2 | 0 | Other connections work, and the database is reachable later. Example: The same hostname works once the database finishes starting.
- Compose is buggy => s2 | 0 | Compose did what it was told. The configuration lacks a readiness condition. Example: depends_on without a condition only orders startup.

### s2
text: How do you make the app wait for a healthy database?
- Add a health check to the database and depends_on with condition service_healthy => s3 | 2 | The health check defines ready and Compose waits for it. Example: healthcheck: test pg_isready, and web depends_on db condition service_healthy.
- Add a fixed sleep to the app => s3 | 1 | A sleep guesses the time and is wrong when recovery is slower. Example: sleep 5 fails when recovery takes 20 seconds.
- Restart the stack until it works => s3 | 0 | It hides the problem and wastes time. Example: Three restarts later it works, until the next power cut.

### s3
text: The app should also cope if the database blips later. What do you add?
- Retries with backoff in the application when connecting => s4 | 2 | Applications should tolerate short outages of dependencies. Example: The app retries the connection for 30 seconds before exiting.
- Nothing, Compose handles it => s4 | 0 | Compose only controls start order. Example: A restart of the database later still crashes the app.
- Disable the health check => s4 | 0 | You lose the signal. Example: Compose cannot tell when the database is ready.

### s4
text: How do you confirm the fix? Choose the move you would make next.
- Restart the full stack from a clean state several times and check logs => end-win | 2 | Repeated clean starts prove the race is gone. Example: docker compose down then up -d three times, each reaching healthy.
- Run it once and trust it => end-ok | 1 | Races are intermittent, so one run proves little. Example: It passes once by luck.
- Skip testing => end-fail | 0 | Shipping unproven configuration risks repeating the outage. Example: The next restart fails.

### end-win
end: win
text: The stack waits for a real readiness signal and the app retries, so restarts are safe.
takeaway: Define ready, wait for it and make clients tolerate blips.

### end-ok
end: ok
text: The stack starts, but a later database blip could still crash the app.
takeaway: Add retries in the app. Review the lesson and try the game again.

### end-fail
end: fail
text: The stack still races and restarts in a loop after every power cut.
takeaway: Use health checks rather than guesses.

