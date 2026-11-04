# A file upload and image processing service
level: Beginner
modules: cloud, docker, python
lessons: cloud/compute-and-storage, cloud/serverless, docker/containers-and-images
summary: How users upload large files straight to object storage, how events start background processing, and how results reach a CDN.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Let users upload files of many megabytes without tying up app servers
- Create thumbnails and other sizes in the background
- Serve files fast anywhere
- Keep unsafe files and private files protected

## The big picture

```diagram
title: Upload and image processing reference design
node: user | User browser | 0 | 1 | Uploads a file and later views the result. | Large uploads on slow links fail halfway.
node: app | App server | 1 | 1 | Checks the user and gives out a short-lived upload permission. | If files pass through the app, it needs huge memory and bandwidth.
node: store | Object storage | 2 | 1 | Holds the original files durably. | Public by default is the classic data leak.
node: event | Storage events | 3 | 0 | Announce that a new object arrived. | Events can arrive more than once.
node: proc | Processing workers | 3 | 1 | Scan, resize and convert images in containers or functions. | A malicious image can attack the library that opens it.
node: meta | Metadata database | 2 | 0 | Remembers owner, status and sizes of each file. | Missing rows leave orphaned files that cost money.
node: cdn | CDN | 4 | 1 | Caches the processed images near users. | Wrong cache rules serve one user another user's private file.
node: scan | Malware scan | 3 | 2 | Checks every upload before it is made available. | Skipping the scan trusts every visitor.
edge: user | app
edge: user | store
edge: store | event
edge: event | proc
edge: proc | scan
edge: proc | store
edge: proc | meta
edge: store | cdn
edge: cdn | user
```

## One upload, step by step

1. The browser asks the app for permission to upload. The app checks the user, file type and size limit and returns a signed URL that works for a few minutes for one object name.
2. The browser sends the file straight to object storage using that URL. The app server never touches the bytes.
3. Storage emits an event. A worker receives it, marks the file "processing" in the database and scans it.
4. If the scan is clean, the worker creates thumbnails and other sizes and writes them to storage under new names.
5. The worker sets the status to "ready". The page now shows the thumbnail through the CDN.
6. If anything fails, the status becomes "failed" with a reason, and the original file is kept for a retry or removed by a lifecycle rule.

## Why the design looks like this

- **Signed URLs** let the browser talk to storage directly, which saves app capacity and keeps credentials short-lived.
- **Events and workers** make processing asynchronous, so uploads stay fast even when conversion is slow.
- **Status in a database** gives the user an honest state instead of a broken image.
- **Separate names for outputs** avoid overwriting the original and make retries safe.
- A **CDN** serves popular images from the edge, so storage sees few reads.

## Scaling decisions

1. Begin with direct uploads and one worker that makes one thumbnail size.
2. Add a queue between events and workers so bursts do not overwhelm them.
3. Add multipart upload for files above a few hundred megabytes, so a failed part can be retried alone.
4. Add lifecycle rules to move old originals to cheaper storage or delete them.
5. Add per-user limits to stop one account filling the storage.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Public bucket by mistake | Private files are readable by anyone | Block public access at the account level, review policies |
| Duplicate event | The same file is processed twice | Idempotent workers that check the status first |
| Malicious file | The image library crashes or is exploited | Scan, run workers with minimal rights and no secrets, limit size and dimensions |
| Upload never completes | Orphan parts cost money | Abort incomplete uploads after a day with a lifecycle rule |
| Cache serves the wrong file | One user sees another's image | Signed or private cache rules, unique names per file |
| Cost growth | Storage and transfer bills climb | Lifecycle rules, compression, per-user quotas |

## Trade-offs

- Direct uploads are efficient but give you less control in the middle. You enforce limits by what the signed URL allows and by checks afterward.
- Processing on upload makes views fast and costs storage. Processing on first view saves storage but makes the first view slow.
- Functions scale to zero and suit spiky work. Containers suit heavy, steady work and long jobs.

```predict
Q: Why should the app hand out a signed URL instead of receiving the file itself?
???
Large files would use the app server's memory, network and time, and a few slow uploads could block normal requests. A signed URL moves the bytes straight to storage and keeps the app small and scalable.
> Keep large data off the servers that do the thinking.
```
