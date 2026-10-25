---
title: DevSecOps and security
summary: Scanning, secrets, signing, container and cluster hardening, cloud identity checks and incident first steps.
module: security
---

## Scan code, dependencies and images

```bash
trivy fs --severity HIGH,CRITICAL --exit-code 1 .
trivy image --ignore-unfixed --severity HIGH,CRITICAL registry.example.com/app:1.4
trivy config ./terraform
checkov -d ./terraform
semgrep scan --config auto .
syft registry.example.com/app:1.4 -o spdx-json > sbom.json
grype sbom:./sbom.json --fail-on high
```

> **Caution:** A clean scan means no known issues in the packages the tool recognised. It does not prove the application is safe.

## Secrets

```bash
trufflehog filesystem . --only-verified
detect-secrets scan > .secrets.baseline
aws sts get-caller-identity
aws iam list-access-keys --user-name deploy
aws iam update-access-key --user-name deploy --access-key-id AKIA... --status Inactive
```

> **Warning:** Disable or rotate a leaked key first. Removing it from the repository does not make it safe.

## Sign and verify artifacts

```bash
cosign generate-key-pair
cosign sign --key cosign.key registry.example.com/app@sha256:abc123
cosign verify --key cosign.pub registry.example.com/app@sha256:abc123
cosign attest --predicate sbom.json --type spdxjson --key cosign.key registry.example.com/app@sha256:abc123
```

Sign by digest, not by tag. A tag can move.

## Harden containers

```bash
docker run --rm --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 200 --memory 256m app:1.4
docker run --rm --user 65532:65532 app:1.4
docker scout cves app:1.4
```

> **Danger:** Do not use `--privileged` or mount `/var/run/docker.sock` into application containers. Both give control of the host.

## Kubernetes security checks

```bash
kubectl auth can-i --list -n shop --as system:serviceaccount:shop:web
kubectl get clusterrolebindings -o wide | grep cluster-admin
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{" "}{.spec.containers[*].securityContext.privileged}{"\n"}{end}'
kubectl label ns shop pod-security.kubernetes.io/enforce=restricted
kubectl get networkpolicy -A
kubectl get secret db -n shop -o jsonpath='{.data.password}' | base64 -d
```

> **Warning:** The last command prints a secret to your terminal and shell history. Use it only when needed and clear the output.

## Cloud identity checks (AWS)

```bash
aws iam get-account-authorization-details > iam.json
aws iam generate-credential-report && aws iam get-credential-report
aws accessanalyzer list-findings --analyzer-arn ARN
aws s3api get-public-access-block --bucket NAME
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin
aws ec2 describe-security-groups --filters Name=ip-permission.cidr,Values=0.0.0.0/0
```

## TLS and certificates

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null | openssl x509 -noout -dates -issuer -subject
openssl x509 -in cert.pem -noout -text | head -30
nmap -sV --script ssl-enum-ciphers -p 443 example.com
```

> **Caution:** Scan only systems you own or have written permission to test.

## Incident first steps

```bash
ss -tunap | head -40
last -a | head
sudo journalctl -u sshd --since "1 hour ago" | grep -i "failed\|accepted"
sudo iptables -I INPUT -s 203.0.113.50 -j DROP
sudo tcpdump -i eth0 -w /secure/capture.pcap host 203.0.113.50
```

> **Danger:** Do not wipe or reboot a suspected compromised host before you have taken a snapshot or memory capture. You will destroy the evidence.
