---
title: Retrieval over runbooks and past incidents
minutes: 14
summary: Let an assistant find the right runbook and the closest past incident by searching your own documents, with careful chunking, metadata filters, citations and a plain "I don't know".
---

An incident assistant that answers from its training alone will invent plausible but wrong commands. One that retrieves your runbooks, postmortems and tickets first, and quotes them, is far more useful and much easier to check. This lesson applies the retrieval ideas from the LLM tree to operations.

## What you will learn

- What to index and how to chunk operations documents
- How metadata filters keep answers relevant and current
- How to combine keyword and vector search
- How to cite sources and say "not found"

## What to index

Runbooks, postmortems, incident timelines, architecture notes, service ownership pages, alert descriptions and resolved tickets. Add the structured context the assistant has during the incident: the failing service, its dependencies and the recent changes. Do not index secrets, customer data or raw logs without redaction.

## Chunking operations documents

Split by meaning, not by character count. A runbook step with its command and its warning belongs together. Keep the document title and section heading in each chunk so a fragment such as "restart the pod" still knows which service it belongs to. For postmortems, chunk by section: summary, timeline, cause, fix, follow-ups. Chunks of a few hundred words with a small overlap work well.

## Metadata filters

Each chunk carries fields: service, environment, document type, owner, last reviewed date and status. Filter before ranking: for a checkout incident, search only checkout and its dependencies' documents. Exclude deprecated runbooks and down-rank old ones. A confident answer from a runbook written for the previous platform is worse than no answer.

## Keyword plus vector

Vector search finds meaning ("pods keep restarting" matches "crash loop"). Keyword search finds exact terms: error codes, hostnames, alert names. Combine them, then rerank the top results. For incident work, exact tokens such as `ORA-00257` or `ImagePullBackOff` often matter most, so do not drop keyword search.

## Cite and abstain

The assistant must show where each statement came from, with a link to the runbook section or incident. It should quote the command, not paraphrase it, and mark the date and owner. If retrieval returns nothing relevant or the top results score low, the answer is "I did not find a runbook for this", plus the closest documents. That honest answer prevents confident nonsense.

```python
def build_prompt(question, chunks, min_score=0.35):
    usable = [c for c in chunks if c["score"] >= min_score and c["status"] == "active"]
    if not usable:
        return None  # caller shows "no relevant runbook found" and the nearest titles
    context = "\n\n".join(
        f"[{i + 1}] {c['title']} (owner: {c['owner']}, reviewed: {c['reviewed']})\n{c['text']}"
        for i, c in enumerate(usable[:5])
    )
    return (
        "Answer only from the numbered sources. Cite them like [1]. "
        "If they do not answer the question, say so.\n\n"
        f"Sources:\n{context}\n\nQuestion: {question}"
    )

chunks = [{"score": 0.62, "status": "active", "title": "checkout: DB pool exhausted",
           "owner": "payments", "reviewed": "2026-09-14",
           "text": "1. Check db_connections_used. 2. Scale pool via helm value pool.max."}]
print(build_prompt("checkout is timing out on the database", chunks))
```

If every chunk scores low or is deprecated, the function returns nothing and the caller says so instead of calling the model with weak context.

## Evaluate retrieval separately

Build a small set of real questions with the document that should answer each. Measure whether the right document appears in the top five. Fix retrieval problems before you tune the prompt. Re-run the set when you change chunking, filters or the embedding model.

## Keep it fresh

Re-index on every change to a runbook. Show the review date and flag documents older than a limit. Add a "this helped / this was wrong" button and review the wrong ones, which usually point at a stale or missing runbook.

```diagram
title: Retrieval for an incident assistant
node: docs | Runbooks and postmortems | 0 | 1 | Documents with owners and review dates. | Stale or deprecated pages indexed. | store
node: chunk | Chunk and tag | 1 | 0 | Split by meaning, tag by service and status. | Chunks with no heading or service. | process
node: ctx | Incident context | 1 | 2 | Failing service, dependencies, recent changes. | Searching all documents regardless. | observe
node: srch | Filter, keyword and vector | 2 | 1 | Filter first, then combine both searches and rerank. | Dropping exact-term search. | service
node: ans | Cited answer | 3 | 1 | Quotes steps with links, or says nothing was found. | Fluent answers with no source. | external
edge: docs | chunk
edge: chunk | srch
edge: ctx | srch
edge: srch | ans
```

## Incident: The runbook for the old platform

> **Incident:** An assistant told an engineer to restart a service with a command that no longer existed after a migration.

```console
$ ragdebug show --query "restart payments worker" --top 3
1  payments/worker-restart-vm.md   status: deprecated  reviewed: 2023-02-01  score 0.71
2  payments/worker-restart-k8s.md  status: active      reviewed: 2026-08-19  score 0.68
(this is a simulated illustration, not a real incident)
```

The deprecated page outranked the current one by a small margin. The team added a status filter, down-ranked pages not reviewed in a year, and required the assistant to print the review date next to every command.

## Common mistakes

- Indexing deprecated documents without a status
- Chunking by character count and losing context
- Dropping keyword search for error codes
- Answering without a citation
- Tuning the prompt before checking retrieval

```quiz
Q: Why filter by service and status before ranking?
+ It keeps answers relevant and current
- It makes search slower :: Not the aim.
- It removes all old data :: It only excludes deprecated.
- It replaces citations :: Different.
> Wrong-service or deprecated sources produce confident errors.

Q: Why keep keyword search?
+ Exact error codes and hostnames are best matched literally
- Vectors cannot be stored :: They can.
- It is cheaper in every case :: Not the reason.
- It cites sources automatically :: No.
> Hybrid search catches both meaning and exact terms.

Q: What should the assistant do if nothing relevant is found?
+ Say so and list the closest documents
- Invent a plausible runbook :: Dangerous.
- Pick a random page :: Misleading.
- Stay silent :: Unhelpful.
> Abstaining is safer than guessing.

Q: How do you evaluate retrieval?
+ A set of real questions with the right documents, checking the top results
- Reading the model's answers casually :: Not systematic.
- Counting indexed pages :: Not quality.
- Asking the vendor :: Not your data.
> Measure retrieval before tuning prompts.
```

```cards
Chunk :: A piece of a document stored and searched as one unit
Metadata filter :: A condition on fields such as service or status
Hybrid search :: Combining keyword and vector search
Citation :: A link showing where each statement came from
Abstain :: Say nothing relevant was found instead of guessing
```
