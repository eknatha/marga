# Heartbleed in OpenSSL, April 2014
company: OpenSSL project and industry
date: 7 April 2014
modules: networking, linux, security
calc: error-budget, retries
source: OpenSSL security advisory 2014-04-07 | https://www.openssl.org/news/secadv/20140407.txt
summary: A missing bounds check in the TLS heartbeat feature let anyone read memory from servers, including private keys and passwords, and most of the internet had to patch and reissue certificates.

## Before you read on
A server answers a request with a length chosen by the client, and copies that many bytes from memory. What if the client lies about the length?

## The system
OpenSSL is the library that provides TLS for a large share of web servers, mail servers and devices. The heartbeat extension lets one side check that the other is still there by sending some data and receiving the same data back.

## Timeline as reported
- A flaw was introduced in the heartbeat code in 2012, in a version of OpenSSL that was widely deployed.
- It was discovered independently by researchers at Google and at Codenomicon, and reported to the project, which released a fix on 7 April 2014.
- The bug let an attacker request up to about 64 kilobytes of memory from the server per request, with no trace in the normal logs.
- Operators patched, then had to revoke and reissue certificates and change passwords, because private keys might have been exposed.
- Large scale scanning by attackers followed. Work on the project funding and review followed, with the creation of the Core Infrastructure Initiative.

## Root cause
A missing bounds check in a rarely needed feature, in a critical library that had little review and funding.

## What changed
- OpenSSL fixed the check and gained funding and more reviewers, and forks such as LibreSSL emerged.
- Operators learned to reissue keys quickly, and the practice of forward secrecy spread so that old traffic is protected.

## Lessons learned
- Disable features that you do not use, and keep libraries current with a tested patch process.
- Be ready to reissue certificates and rotate credentials quickly, and keep an inventory of where they are used.
- Use forward secrecy so recorded traffic cannot be decrypted later.
- Fund and review critical open source infrastructure.

## Trade-offs to weigh
- **Features against attack surface.** Each optional feature is code that may hold a bug.
- **Shared library against diversity.** One library is efficient, and one flaw reaches everybody.
- **Rotating keys.** Rotation limits the damage, and takes work for every certificate.

## Try the calculators
In the error budget calculator, think of patch time as budget: how many days would your estate stay open? In the retries calculator, see how automated probing adds load across the internet.
