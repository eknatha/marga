---
title: Working with APIs and JSON using curl and jq
minutes: 14
summary: Call REST APIs from the shell with curl, process JSON with jq, handle errors and pagination, and keep secrets out of command history.
---

Modern infrastructure is controlled through APIs: cloud providers, Kubernetes, monitoring systems and chat tools. `curl` talks to them, and `jq` turns their JSON responses into exactly the fields you need.

## What you will learn

- The curl flags you need for scripts
- Selecting, filtering and reshaping JSON with jq
- Checking HTTP status codes and retrying
- Passing credentials safely

## curl for scripts

```console
$ curl -sS https://api.example.com/v1/health
$ curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" https://api.example.com/v1/health
$ curl -fsS -m 10 --retry 3 --retry-delay 2 https://api.example.com/v1/servers
$ curl -fsS -X POST https://api.example.com/v1/servers -H "Content-Type: application/json" -d '{"name":"web-3","size":"small"}'
```

The flags to remember: `-s` silences the progress meter, `-S` still shows errors, `-f` makes curl exit non-zero for HTTP 400 and above, `-m` sets a time limit, and `-w` prints details such as the status code. Without `-f`, a 500 response with an HTML error page looks like success to your script.

## Credentials

Never write tokens on the command line, because they appear in the process list and shell history. Read them from the environment, a file or a secret manager.

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${API_TOKEN:?set API_TOKEN}"

curl -fsS -m 10 \
  -H "Authorization: Bearer ${API_TOKEN}" \
  https://api.example.com/v1/servers
```

With `--config` curl can also read headers from a file or standard input, which keeps them out of `ps` output.

## jq basics

```console
$ echo '{"items":[{"name":"web-1","cpu":0.91,"tags":["prod"]},{"name":"db-1","cpu":0.40,"tags":["prod","db"]}]}' > servers.json
$ jq '.items[].name' servers.json
$ jq -r '.items[] | select(.cpu > 0.8) | .name' servers.json
$ jq -r '.items[] | [.name, .cpu] | @tsv' servers.json
$ jq '.items | map({host: .name, hot: (.cpu > 0.8)})' servers.json
$ jq '[.items[] | select(.tags | index("db"))] | length' servers.json
```

`-r` outputs raw strings without quotes, which is what shell variables want. `select()` filters, `map()` transforms every element, and `@tsv` or `@csv` format rows for reports. Use `jq -e` in conditions so a false or null result gives a non-zero exit code.

## Building JSON safely

Never assemble JSON by gluing strings together: a quote in a value breaks the document.

```console
$ jq -n --arg name "web-3" --argjson replicas 3 '{name: $name, replicas: $replicas}'
$ jq --arg v "1.8.2" '.version = $v' config.json > config.new && mv config.new config.json
```

## Pagination and status checks

```bash
#!/usr/bin/env bash
set -euo pipefail
url="https://api.example.com/v1/servers?limit=100"
while [ -n "$url" ]; do
  resp=$(curl -fsS -m 10 -H "Authorization: Bearer ${API_TOKEN}" "$url")
  echo "$resp" | jq -r '.items[].name'
  url=$(echo "$resp" | jq -r '.next // empty')
done
```

The `// empty` fallback prevents the literal string `null` ending up in the variable when there is no next page, so the loop ends cleanly.

## Incident: the pipeline that deployed on a 502

> **Incident:** A deploy script runs `curl https://api/deploy/status | jq -r .state`. The API returns a 502 HTML page, jq fails to parse it, and because the pipeline lacks `pipefail` the step still exits 0. The pipeline then proceeds as if the deployment had succeeded.

Two defects: curl did not fail on HTTP errors, and the pipeline hid the failure. The robust version:

```bash
set -euo pipefail
state=$(curl -fsS -m 15 --retry 3 "https://api.example.com/deploy/status" | jq -er '.state')
[ "$state" = "ready" ] || { echo "deployment is $state" >&2; exit 1; }
```

`-f` fails on 4xx and 5xx, `pipefail` propagates the error from the first command in the pipe, and `jq -e` fails when the field is missing.

## Common mistakes

- Using curl without `-f`, so errors look like success
- Putting tokens on the command line
- Building JSON bodies with string concatenation
- Forgetting `-r`, leaving quotes in shell variables
- Ignoring pagination and seeing only the first page

```quiz
Q: What does curl -f do?
- Follows redirects
+ Fails with a non-zero exit code on HTTP errors such as 404 and 500
- Forces HTTP/2
- Formats the output
> Without it, an error page is treated as a successful response.

Q: What does jq -r do?
- Reverses the output
+ Prints raw strings without JSON quotes
- Reads from a file
- Retries the query
> Raw output is what shell variables and further commands want.

Q: Why avoid putting an API token directly in the curl command line?
+ It is visible in process lists and shell history
- curl rejects it
- It makes the request slower
- Servers ignore it
> Read secrets from the environment or a file instead.

Q: How should you build a JSON request body in a script?
- Concatenate strings with echo
+ Use jq -n with --arg or --argjson so values are escaped correctly
- Use sed
- Write it by hand each time
> jq handles quoting and escaping so special characters cannot break the document.
```

```cards
curl flag to time-limit a request? :: -m (or --max-time)
Get a status code with curl? :: curl -s -o /dev/null -w "%{http_code}" URL
jq to filter items by a field? :: jq '.items[] | select(.cpu > 0.8)'
Why set pipefail? :: So a failure in the first command of a pipeline is not hidden by the last one
```
