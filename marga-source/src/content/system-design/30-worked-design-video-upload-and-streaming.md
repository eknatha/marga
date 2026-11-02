---
title: Worked design: video upload and streaming
minutes: 18
summary: From upload to playback: chunked upload, transcoding queues, storage tiers and a CDN, with the failure modes of each stage.
---

A video service is mostly a pipeline and a cache. Large files go in, workers convert them into several formats, and a content delivery network serves millions of viewers. The design is about moving big data reliably, spending compute only where needed, and keeping playback smooth when a stage is slow.

## What you will learn

- Design resumable, chunked uploads
- Build a transcoding pipeline with queues and retries
- Pick storage tiers and use a CDN for delivery
- Handle hot videos, failed jobs and cost control

## 1. Clarify

Creators upload videos up to several gigabytes. Viewers watch on phones and televisions with different speeds. A video should be playable within minutes of upload. Availability of playback matters more than instant availability of new uploads. Cost matters, because storage and delivery are the biggest bills.

## 2. Estimate

Assume 500,000 uploads a day averaging 500 MB, which is 250 TB a day of originals. Each video is converted into five renditions that add about 1.5 times the original, so total storage grows by about 625 TB a day. Playback dominates traffic: 100 million views a day at 100 MB each is 10 PB a day, so a CDN carries almost all of it.

## 3. Resumable upload

The client splits the file into chunks of a few megabytes and uploads each with an id and checksum. If the connection drops, it asks which chunks exist and sends only the missing ones. Once all chunks are present, the service assembles the file in object storage and records the upload as complete.

## 4. Transcoding pipeline

A completed upload creates a job in a queue. Workers split the video into segments, convert each segment into every rendition in parallel, then stitch the results and produce a playlist. Jobs are idempotent and have timeouts, so a failed worker is simply retried. Poison files that always fail go to a dead-letter queue for review.

## 5. Storage and delivery

Keep originals in cheap, durable storage and renditions in standard storage. Serve playback through a CDN with segments of a few seconds, so players can switch quality as bandwidth changes. Popular videos stay in the CDN, and rarely watched ones are fetched from the origin on demand.

## 6. Failure modes

| Failure | Effect | Answer |
| --- | --- | --- |
| Upload drops | partial file | resume by chunk, checksums |
| Worker dies | job stalls | visibility timeout and retry |
| Bad file | job loops | retry limit, dead-letter queue |
| Queue backlog | new videos delayed | autoscale workers, priority for small jobs |
| Origin slow | playback stalls | CDN shielding, request coalescing |
| Viral video | origin load spike | pre-warm the CDN, cache at several tiers |

## 7. Trade-offs

More renditions give better playback and cost more storage and compute. Converting every video on upload is simple but wasteful for videos nobody watches, so some services convert popular formats first and others on demand. A longer CDN time to live saves origin load but delays takedowns, so provide a purge path.

## A job record in the pipeline

```yaml
job: transcode
video_id: v_8f31a2
source: s3://originals/v_8f31a2/source.mp4
segments: 120
renditions: [240p, 360p, 480p, 720p, 1080p]
attempts: 1
max_attempts: 3
timeout_seconds: 900
on_final_failure: dead_letter
output: s3://renditions/v_8f31a2/
```

The job states its retry limit, timeout and where it goes if it fails for good. This is how a pipeline stays reliable without humans watching every job.

## How it fails

A big upload restarts from zero after a network drop. A corrupt file makes workers retry forever. The queue backs up after a burst of uploads. A viral video overloads the origin. A takedown does not reach the CDN.

## Incident: A file that never finished converting

> **Incident:** One uploaded file had a corrupt header. Workers picked it up, crashed, and the job returned to the queue, over and over. Each retry consumed a worker, and the backlog delayed other creators.

```console
$ queuectl stats transcode
depth 5400   in_flight 120   retries_today 38812
$ queuectl top-retries transcode
v_9c20b7  attempts 412
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. A retry limit with a dead-letter queue turns a poison file into one reviewed item, instead of a long-running drain on shared workers.

## Interview question

"Design video upload and streaming." Estimate storage and egress, use chunked resumable upload, a queue of idempotent transcode jobs with a dead-letter queue, tiered storage and a CDN, and walk the failure table.

## Common mistakes

- Uploading a large file in one request
- Unlimited retries for failing jobs
- Serving video from the origin instead of a CDN
- No path to purge a removed video from the cache

```quiz
Q: Why upload in chunks?
+ A dropped connection resumes with the missing chunks only
- To avoid checksums :: Checksums are still used.
- To store less data :: Storage is the same.
- To skip the CDN :: Unrelated.
> Correct: A dropped connection resumes with the missing chunks only. Re-read the matching lesson section for the full reasoning.

Q: What should happen to a file that keeps failing conversion?
+ After a retry limit it goes to a dead-letter queue for review
- Retry forever :: Drains workers.
- Delete it silently :: Hides the problem.
- Stop all workers :: Overreaction.
> Correct: After a retry limit it goes to a dead-letter queue for review. Re-read the matching lesson section for the full reasoning.

Q: Why does a CDN matter most here?
+ Playback traffic is far larger than upload traffic
- Uploads need the CDN most :: Playback dominates.
- CDNs encrypt originals :: Not the reason.
- CDNs convert video :: They do not.
> Correct: Playback traffic is far larger than upload traffic. Re-read the matching lesson section for the full reasoning.

Q: Why make transcode jobs idempotent?
+ A retry after a worker failure must not corrupt or duplicate output
- So jobs never fail :: They can fail.
- To skip timeouts :: Timeouts are needed.
- To save checksums :: Unrelated.
> Correct: A retry after a worker failure must not corrupt or duplicate output. Re-read the matching lesson section for the full reasoning.
```

```cards
resumable upload :: upload in chunks so a drop can continue
transcoding :: converting video into several formats and sizes
dead-letter queue :: where jobs go after repeated failure
CDN shielding :: an intermediate cache layer that protects the origin
```
