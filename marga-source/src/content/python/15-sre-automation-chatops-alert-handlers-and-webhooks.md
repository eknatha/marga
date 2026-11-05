---
title: SRE automation: chatops, alert handlers and webhooks
minutes: 12
summary: Build a small webhook receiver that verifies signatures, deduplicates alerts and posts useful messages, and keep automated actions safe with allow lists and approvals.
---

Many teams connect alerts, chat and automation: an alert posts to a channel, and a button or command runs a runbook step. The idea is simple, but the receiver is an internet-facing program that can run actions, so it needs care.

## What you will learn

- Receive a webhook and verify that it is genuine
- Deduplicate and group alerts so channels stay readable
- Post structured messages with context and links
- Keep actions behind allow lists, approval and an audit trail

## A minimal receiver with verification

```python
import hmac, hashlib, json
from http.server import BaseHTTPRequestHandler, HTTPServer

SECRET = b"read-this-from-a-secret-store"

class Hook(BaseHTTPRequestHandler):
    def do_POST(self):
        size = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(min(size, 1_000_000))
        sent = self.headers.get("X-Signature", "")
        want = hmac.new(SECRET, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sent, want):
            self.send_response(401); self.end_headers(); return
        handle(json.loads(body))
        self.send_response(202); self.end_headers()

def handle(event):
    print("alert", event.get("name"), event.get("severity"))

if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8080), Hook).serve_forever()
```

A webhook URL can leak, so never trust the body alone. The sender signs the body with a shared secret, and you recompute the HMAC and compare in constant time with `hmac.compare_digest`. Limit the body size, answer quickly with `202`, and do slow work in a queue or a thread. In production use a real framework behind TLS, with the secret in a secret manager.

## Keep the channel readable

Send one message per incident, not per alert. Use a **fingerprint** (service, alert name and environment) as the key. If it was seen in the last few minutes, update the existing message or increase a counter instead of posting again. Include what matters: severity, service, a one-line symptom, a dashboard link, the runbook link and who is on call. Avoid walls of JSON.

## Actions with guard rails

A button that restarts a service is useful and dangerous. Define an **allow list** of actions (restart service X in staging, scale Y between 2 and 10), check who pressed the button against a group, ask for a second approval for production, and write an audit line with person, action, target and result. Make actions idempotent and time-limited, and never let chat text become a shell command: map a fixed action name to a fixed function.

```predict
Q: A chat command says "restart $SERVICE" and the script runs os.system("systemctl restart " + name). What is wrong?
???
User text reaches a shell, so a crafted name can run any command. Use an allow list and pass arguments as a list without a shell.
> Never build commands from chat input.
```

## Incident: The channel nobody read

> **Incident:** During a real outage the on-call engineer missed the key alert because the channel had 900 messages in an hour.

```console
$ grep -c "DiskPressure" alerts.log
312
$ grep -c "PaymentsDown" alerts.log
1
```

One flapping node alert posted 312 times and buried the single message that mattered. The team added fingerprint-based grouping with a cooldown, routed severity-high alerts to paging and the rest to a quiet channel, and added a rule that a flapping alert posts once with a counter. The next incident had a short, readable timeline.

## Common mistakes

- Accepting webhooks without a signature check
- Posting every alert as a separate message
- Letting chat input reach a shell
- Actions without approval or an audit trail

```quiz
Q: How do you confirm that a webhook is genuine?
+ Recompute the HMAC of the body with the shared secret and compare in constant time
- Check the sender's IP only :: IPs can be spoofed or shared.
- Trust any POST :: Anyone could call the URL.
- Check the content length :: Not authentication.
> Signatures prove origin.

Q: What should a deduplication key contain?
+ Service, alert name and environment
- A timestamp :: It makes every key unique.
- A random number :: Prevents grouping.
- The message text only :: Wording can change.
> The fingerprint identifies the same problem.

Q: Why use an allow list of actions?
+ So chat users can run only approved, bounded operations
- To speed up Python :: Unrelated.
- To avoid logging :: You should log.
- To allow any command :: Opposite.
> Constrain what the bot can do.

Q: Why respond quickly with 202?
+ The sender should not time out while you do slow work elsewhere
- To skip verification :: Verify first.
- To hide errors :: Not the reason.
- To close the port :: Unrelated.
> Acknowledge fast, process safely.
```

```cards
HMAC signature :: proves the webhook came from the secret holder
Fingerprint :: service plus alert plus environment, used to group alerts
Allow list :: fixed set of approved actions
Audit line :: who ran what, on which target, with what result
No shell from chat :: never build commands from user text
```
