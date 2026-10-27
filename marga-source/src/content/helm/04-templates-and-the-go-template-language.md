---
title: Templates: the Go template language in Helm
minutes: 13
summary: Write templates with values, conditionals, loops, helpers and the common functions, and avoid indentation and quoting traps.
---

Helm templates are Kubernetes YAML with small pieces of logic inside double curly braces. The logic is Go templating plus a library of helper functions. You do not need all of it. A dozen patterns cover nearly every chart, and the main skill is keeping the output valid YAML, because template whitespace and indentation are where most chart bugs hide.

## What you will learn

- Insert values and built-in objects
- Use if, with and range
- Define and include helpers, and use toYaml with nindent
- Control whitespace and fail early with required

## Values and objects

```text
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-web
  labels:
    app.kubernetes.io/name: {{ .Chart.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: web
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
```

The top-level objects are `.Values` (your values), `.Release` (name, namespace, revision, whether it is an upgrade), `.Chart` (Chart.yaml fields), and `.Capabilities` (cluster version and API support). The pipe `|` passes a value into a function: `default`, `quote`, `upper`, `trunc`, `sha256sum` and many more. Use `quote` for strings that might look like numbers or booleans.

## Conditions and loops

```text
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}
spec:
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ . | quote }}
    {{- end }}
{{- end }}
```

`if` renders a block only when the value is set (an empty string, zero, false or empty list count as false). `range` repeats a block for each item, with `.` bound to the current item. `with` changes `.` to a value if it is not empty. Inside `range` or `with`, use `$` to reach the root, for example `$.Release.Name`.

## Helpers and toYaml

```text
# templates/_helpers.tpl
{{- define "web.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
```

```text
metadata:
  labels:
    {{- include "web.labels" . | nindent 4 }}
spec:
  template:
    spec:
      containers:
        - name: web
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

`include` renders a named template and returns a string that you can pipe, unlike `template`. `toYaml` turns a value into YAML text and `nindent N` adds a newline and indents each line by N spaces; the indent must match the position in the file, or the YAML breaks.

## Whitespace and failing early

A dash inside braces trims whitespace: `{{-` removes the space before, `-}}` after. Use it so that conditionals do not leave blank lines or break indentation. To stop users from installing without a mandatory value, use `required`:

```text
image: "{{ required "image.repository is required" .Values.image.repository }}"
```

For friendlier errors on bad combinations, call `fail`. Always test with `helm template` and with several values files, including the case where optional blocks are disabled. Debug with `helm template --debug`, which prints the rendered text even when it is not valid YAML, and use `kubectl apply --dry-run=server` to check against the real API.

```predict
Q: A template renders `resources:` followed by lines indented too little, and the install fails with a YAML error. What is the usual cause and fix?
???
The nindent number does not match the position of the key. Count the indentation of the parent key and use that plus the child level.
> nindent must equal the destination column.
```

## Incident: The empty ingress that blocked a rollout

> **Incident:** A chart upgrade failed in staging only, with a message about an unknown field.

```console
$ helm upgrade shop-web ./shop-web -n shop -f values-staging.yaml
Error: UPGRADE FAILED: error validating "": error validating data: unknown field "rules" in io.k8s.api.networking.v1.IngressSpec
$ helm template ./shop-web -f values-staging.yaml | sed -n 40,50p
spec:
  rules:
```

With ingress.hosts empty, the range produced no items, but the template still rendered an empty rules: key with bad indentation. The fix wrapped the whole Ingress in a condition that checks both enabled and a non-empty host list, and the team added a CI job that renders the chart with several values files (all optional features on, all off) and validates the output.

## Common mistakes

- Wrong nindent values
- Forgetting quote on strings that look like numbers
- Rendering only with default values in tests
- Putting complex logic in templates

```quiz
Q: What does the pipe in {{ .Values.x | quote }} do?
+ Passes the value into the quote function
- Writes a comment :: No.
- Starts a loop :: No.
- Reads a file :: No.
> Functions are chained left to right.

Q: What is the difference between include and template?
+ include returns a string that can be piped, template cannot
- They are identical :: include can be piped.
- include only reads files :: No.
- template is newer :: Not the difference.
> Use include with nindent.

Q: What does {{- do?
+ Trims the whitespace before the action
- Comments out the line :: No.
- Starts a loop :: No.
- Quotes the value :: No.
> Controls blank lines; the lesson section explains why.

Q: How can a chart force a required value?
+ Use the required function with a message
- Add a comment :: Comments do nothing.
- Use default :: default hides the problem.
- Use quote :: No.
> Fail early with a clear error.
```

```cards
Objects :: .Values .Release .Chart .Capabilities
Default :: .Values.x | default "y"
Conditional :: {{- if .Values.x }} ... {{- end }}
Loop :: {{- range .Values.list }}
YAML block :: toYaml ... | nindent N
Mandatory :: required "message" .Values.x
```
