---
title: Supply chain security: SBOMs, signing and provenance
minutes: 13
summary: Know what is inside your software, prove where it was built, and verify signatures before anything runs in production.
---

A popular library you depend on is found to contain a serious flaw. The first question is simple and often unanswerable: which of our services use it, and in which version? Supply chain security is about being able to answer that in minutes, and about trusting only artifacts you can trace back to a build you control.

## What you will learn

- What a software bill of materials (SBOM) is and how to generate one
- Signing artifacts and verifying signatures
- Provenance: proof of how and where an artifact was built
- Practical controls: pinning, lockfiles, private mirrors and admission checks

## Know what you ship

An **SBOM** is a machine-readable list of the components inside an artifact: libraries, versions, licences and where they came from. Common formats are SPDX and CycloneDX. Generate one at build time for every image and package, store it next to the artifact, and index them so you can search across all services.

```console
$ syft registry.example.com/shop/api:1.8.2 -o cyclonedx-json > api-1.8.2.sbom.json
$ grype sbom:api-1.8.2.sbom.json --fail-on high
```

When a new vulnerability is announced, you search the SBOM index for the affected package and version, not every repository by hand. An SBOM does not make software safe; it makes questions answerable.

## Sign and verify

A signature proves that an artifact came from a known identity and was not changed afterwards. Keyless signing with short-lived certificates tied to the pipeline identity avoids long-lived private keys.

```console
$ cosign sign registry.example.com/shop/api@sha256:9f2c...
$ cosign verify registry.example.com/shop/api@sha256:9f2c... \
    --certificate-identity-regexp "https://ci.example.com/.*" \
    --certificate-oidc-issuer https://ci.example.com
```

Signing alone is worthless unless something checks it. Verify in the cluster with an admission policy that refuses unsigned images, and refer to images by digest, because tags can be moved.

## Provenance

**Provenance** is a signed statement of how an artifact was made: which source revision, which builder, which build steps and inputs. The SLSA framework describes levels: at the lowest you have a build script, at higher levels the build runs on a hosted, isolated builder that produces provenance the developers cannot forge. With provenance you can answer "was this image built from the reviewed main branch by our pipeline?" and reject anything built on a laptop.

## Everyday controls

- Use **lockfiles** and pin versions, with hashes where the tool supports it.
- Pull dependencies through a **private mirror** that scans and caches them, so a deleted or hijacked public package does not break or poison builds.
- Watch for **typosquatting** (similar names) and for sudden maintainer changes.
- Update dependencies on a schedule with automated pull requests and tests, so security fixes are small.
- Keep build systems patched and short-lived, because the pipeline itself is a target.

```predict
Q: A new flaw is announced in a library. Which preparation lets you find affected services within minutes?
???
Stored SBOMs for every artifact, indexed so you can search by package and version.
> You cannot protect what you cannot list.
```

## Incident: Which services use this library?

> **Incident:** On the day a critical flaw in a logging library was announced, management asked for the list of affected services. It took the team three days.

```console
$ grep -r "log4j" */pom.xml | wc -l
41
$ ./sbom-search.sh log4j-core 2.14
no index found
```

Without SBOMs the team searched repositories, base images and vendor products by hand, and missed transitive dependencies. Afterward they generated SBOMs in every build, stored them with the artifacts, built a small search service, and added an admission policy that only allows signed images built by the pipeline. The next announcement was answered in twenty minutes.

## Common mistakes

- Generating SBOMs and never searching them
- Signing images without verifying the signature anywhere
- Using tags instead of digests
- Pulling dependencies straight from the public internet in every build

```quiz
Q: What is an SBOM?
+ A machine-readable list of the components inside software
- A backup of the database :: Unrelated.
- A list of employees :: Not software content.
- A firewall rule set :: Not what it is.
> It makes dependency questions answerable.

Q: Why verify signatures at deploy time?
+ A signature only helps if something refuses unsigned or untrusted artifacts
- It speeds up pulls :: It does not.
- It reduces image size :: It does not.
- It is optional once signed :: Unchecked signatures give no protection.
> Enforcement is the control.

Q: What does provenance describe?
+ How, where and from which source an artifact was built
- Who pays for it :: Not its meaning.
- Where it is cached :: Not its meaning.
- Its licence cost :: Not its meaning.
> It proves the build path.

Q: Why refer to images by digest?
+ A tag can be moved to different content, a digest cannot
- Digests are shorter :: They are longer.
- Tags are forbidden :: They are allowed.
- Digests encrypt images :: They do not.
> Immutability matters.
```

```cards
SBOM :: list of components in an artifact
Signature :: proves origin and integrity
Provenance :: signed record of how it was built
Pin images by :: digest
Search on announcement :: SBOM index
```
