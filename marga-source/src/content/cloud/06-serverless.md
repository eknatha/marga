---
title: Serverless: Lambda, Azure Functions and event-driven design
minutes: 16
summary: Run code without managing servers, connect functions to queues, storage and APIs, understand cold starts, concurrency and limits, and control cost and failures.
---

Serverless does not mean no servers. It means you hand the provider the job of provisioning, patching and scaling, and pay for execution rather than idle time. It fits spiky, event-driven work very well and some steady, latency-sensitive work very badly, so you need to know the trade-offs.

## What you will learn

- The function model on AWS Lambda and Azure Functions
- Triggers: HTTP, queues, storage events and schedules
- Cold starts, concurrency, timeouts and memory settings
- Failure handling: retries, dead-letter queues and idempotency

## The model

You upload a small unit of code with a handler. The platform runs it on demand in response to an **event**, scales the number of concurrent copies automatically, and bills by invocation count and duration multiplied by memory size.

```python
import json
import os
import boto3

s3 = boto3.client("s3")
BUCKET = os.environ["REPORT_BUCKET"]

def handler(event, context):
    for record in event["Records"]:
        body = json.loads(record["body"])
        key = f"reports/{body['order_id']}.json"
        s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(body).encode())
    return {"processed": len(event["Records"])}
```

Initialise clients **outside** the handler, as above, so warm invocations reuse connections instead of rebuilding them.

| Concept | AWS | Azure |
|---------|-----|-------|
| Function service | Lambda | Azure Functions |
| HTTP front door | API Gateway or function URL | HTTP trigger, API Management |
| Queue trigger | SQS | Storage Queue or Service Bus |
| Event routing | EventBridge | Event Grid |
| Workflow | Step Functions | Durable Functions, Logic Apps |
| Identity | Execution role | Managed identity |

## Triggers

- **HTTP**: a request through a gateway invokes the function synchronously
- **Queue**: messages are read in batches, with the platform scaling consumers with queue depth
- **Storage events**: an object upload invokes a function to create thumbnails or scan files
- **Schedule**: a cron expression runs maintenance tasks

```console
$ aws lambda create-function --function-name order-worker --runtime python3.12 --handler app.handler --zip-file fileb://function.zip --role arn:aws:iam::123456789012:role/order-worker
$ aws lambda invoke --function-name order-worker --payload '{"Records":[]}' --cli-binary-format raw-in-base64-out out.json
$ aws lambda get-function-configuration --function-name order-worker --query '[MemorySize,Timeout,Runtime]'
$ aws logs tail /aws/lambda/order-worker --since 15m
$ func start
$ az functionapp list -o table
```

## Cold starts, concurrency and limits

A **cold start** happens when the platform must create a new execution environment: download code, start the runtime, run initialisation. It adds latency from tens of milliseconds to a few seconds, depending on language, package size and VPC attachment. Mitigations are smaller packages, lighter runtimes, provisioned concurrency (AWS) or the Premium plan (Azure), and keeping initialisation lean.

Limits matter. A function has a maximum duration (15 minutes on Lambda), a memory range, payload size limits and an **account concurrency limit** shared across all functions. A burst can exhaust it and starve unrelated functions, so set **reserved concurrency** on critical functions and a cap on noisy ones. Memory also sets CPU: giving a function more memory often makes it finish faster, sometimes at a lower total cost.

## Failure handling

Queue and event triggers retry on error, so your code runs **at least once**. It must be safe to run twice.

```python
def handler(event, context):
    for record in event["Records"]:
        body = json.loads(record["body"])
        if already_processed(body["order_id"]):
            continue
        process(body)
        mark_processed(body["order_id"])
```

Configure a **dead-letter queue** so messages that fail repeatedly are kept for inspection rather than retried forever or dropped. Set the queue's visibility timeout longer than the function's timeout, or messages will be delivered again while the first attempt is still running.

## Serverless cost thinking

Cost scales with usage, which is wonderful at low volume and can become the expensive choice at constant high volume, where a container or VM may be cheaper. Watch for a recursive trigger (a function that writes to the bucket that triggers it), unbounded retries, and over-provisioned memory.

## Incident: the function that triggered itself

> **Incident:** A function resizes images uploaded to a bucket and writes the result back to the same bucket. Within minutes the invocation count explodes to millions, the bill alarm fires, and the account's concurrency limit throttles every other function, including checkout.

Writing to the trigger bucket created a loop. Break it quickly, then fix the design:

```console
$ aws lambda put-function-concurrency --function-name image-resizer --reserved-concurrent-executions 0
$ aws s3api get-bucket-notification-configuration --bucket acme-uploads
$ aws lambda delete-function-event-source-mapping --uuid 1234abcd
```

Setting reserved concurrency to zero stops execution immediately. Then write outputs to a **different bucket or prefix**, filter the trigger by prefix (`uploads/`), set budget alarms and concurrency caps on every function, and use a dead-letter queue.

## Common mistakes

- Creating clients inside the handler on every call
- Assuming exactly-once delivery
- No concurrency limits, letting one function starve others
- Triggering a function from its own output
- Choosing serverless for steady heavy load without comparing cost

```quiz
Q: What is a cold start?
- A function failing
+ Extra latency while the platform creates a new execution environment
- A storage error
- A billing cycle
> Initialisation work happens before the first request is served.

Q: Why must serverless handlers be idempotent?
- Functions run only once
+ Queue and event triggers deliver at least once, so retries and duplicates occur
- The platform deletes data
- It reduces memory use
> Handle the same event twice without harmful side effects.

Q: What does a dead-letter queue hold?
+ Messages that repeatedly failed processing, kept for inspection
- Successful messages
- Function logs
- Code packages
> It prevents endless retries and loss of failed messages.

Q: How can one runaway function affect others?
- It cannot
+ It can exhaust the account's shared concurrency limit
- It deletes their code
- It changes their permissions
> Use reserved concurrency to protect critical functions.
```

```cards
Why create SDK clients outside the handler? :: Warm invocations reuse them instead of reconnecting
What does reserved concurrency do? :: Guarantees and caps the concurrent executions for a function
Delivery guarantee of most triggers? :: At least once
What affects Lambda CPU power? :: The memory setting
```
