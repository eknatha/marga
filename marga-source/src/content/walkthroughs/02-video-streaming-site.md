# A video streaming site
level: Intermediate
modules: networking, cloud, observability
lessons: networking/latency-mtu-and-network-performance, cloud/high-availability-and-disaster-recovery, observability/telemetry-cost-and-cardinality
summary: How uploads are processed into many formats, stored cheaply and delivered worldwide through a content delivery network.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Let creators upload large videos reliably
- Turn each upload into formats that suit phones, TVs and slow networks
- Play smoothly worldwide, starting quickly, without buffering
- Keep storage and delivery costs under control

## The big picture

```diagram
title: Video streaming reference design
node: creator | Creator upload | 0 | 0 | Uploads in chunks directly to object storage with a signed URL. | A single-request upload fails on large files and bad networks.
node: store | Object storage | 1 | 0 | Holds the original file and every encoded version. | Without versioning and replication, a bad delete is permanent.
node: queue | Job queue | 2 | 0 | Triggers transcoding when an upload completes. | A flood of uploads delays all jobs without autoscaling.
node: work | Transcode workers | 3 | 0 | Encode into several resolutions and bitrates and write segments. | Workers are costly. A stuck job wastes compute for hours.
node: meta | Metadata database | 3 | 2 | Holds titles, owners, status and permissions. | Replication lag shows a video as missing right after upload.
node: origin | Origin servers | 2 | 1 | Serve segments and manifests to the cache layer. | Overloaded origins cause global playback failures when caches miss.
node: cdn | CDN edge | 1 | 1 | Caches popular segments near viewers. | A cold or purged cache sends all traffic to the origin at once.
node: viewer | Viewer app | 0 | 2 | Picks quality that fits the bandwidth, segment by segment. | A bad manifest breaks playback for every viewer.
edge: creator | store
edge: store | queue
edge: queue | work
edge: work | store
edge: work | meta
edge: store | origin
edge: origin | cdn
edge: cdn | viewer
edge: viewer | meta
```

## A video, step by step

1. The app asks the API for a **signed upload URL** and uploads the file to object storage in chunks that can resume.
2. Storage emits an event and a job lands in the queue.
3. A worker transcodes the file into several renditions (for example 240p to 4K), cuts each into a few seconds long segments, and writes a **manifest** listing them (HLS or DASH formats).
4. The metadata database marks the video as ready.
5. A viewer's player fetches the manifest and then the segments from the nearest CDN edge. If the edge has them cached it answers at once, otherwise it pulls from the origin and caches for the next viewer.
6. The player measures throughput and switches quality up or down per segment (**adaptive bitrate**).

## Why the design looks like this

- Large files go **straight to object storage**, not through application servers, so the API stays small.
- Transcoding is heavy and bursty, so it runs on **queue-driven workers** that scale with demand and can use cheaper interruptible instances.
- **Segments** make seeking and quality switching cheap, and they cache well because many viewers request the same files.
- A **CDN** moves bytes close to users. Without it the origin would carry all traffic and latency would be high abroad.

## Scaling and cost decisions

- The most watched content is a small fraction of the catalogue. Cache it at the edge, and keep rarely watched renditions in cheaper storage tiers.
- Encode fewer renditions for videos nobody watches, and more for videos that become popular.
- Egress bandwidth is usually the largest bill, so cache hit ratio is a key metric.
- Per-video metrics at high cardinality are expensive, so aggregate by region and rendition.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Upload interrupted | User has to start again | Resumable chunks |
| Transcode job crashes | Video stuck in processing | Retries, timeouts, dead letter queue |
| Cache purge or new release | Origin overloaded | Request collapsing, tiered caches, staged purges |
| Origin region fails | Cache misses fail | Second region and health-checked routing |
| Popular live event | Huge burst on one object | Pre-warming and rate limits |
| Rights or privacy error | Private video served | Signed, short-lived URLs and permission checks at the edge |

## Trade-offs

- More renditions give better playback but cost storage and compute.
- Longer cache lifetimes lower cost but delay fixes and takedowns.
- Segment length trades startup time against overhead. Shorter segments start faster and adapt quicker, with more requests.

```predict
Q: A popular video's cache entries are all purged at once during a release. What do you expect to see on the origin servers?
???
A sudden spike of requests as every edge refills from the origin at the same time, possibly overloading it. Staged purges, request collapsing and a mid-tier cache reduce the spike.
> A cache hides load until it is empty.
```
