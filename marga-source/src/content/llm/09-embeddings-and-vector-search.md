---
title: Embeddings and vector search
minutes: 12
summary: Turn text into vectors, search by meaning with similarity, and understand indexes, chunking and the limits of vector search.
---

Keyword search fails when people use different words for the same idea. Embeddings represent meaning as numbers, which lets you search by similarity. It is the base of retrieval for language model applications.

## What you will learn

- What an embedding is and how similarity works
- Chunking documents and storing vectors with metadata
- Approximate nearest neighbor indexes
- Hybrid search and evaluating retrieval

## Vectors and similarity

```python
import numpy as np

def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

docs = {"reset password": [0.9, 0.1, 0.0], "change billing card": [0.1, 0.9, 0.1]}
query = [0.85, 0.2, 0.05]            # "I forgot my login"
ranked = sorted(docs, key=lambda k: cosine(query, docs[k]), reverse=True)
print(ranked)
```

An embedding model returns a vector of hundreds or thousands of numbers. Texts with similar meaning get vectors that point in similar directions, and **cosine similarity** measures that angle.

## Chunking and metadata

Split documents into pieces of a few hundred tokens along natural boundaries such as headings, with a small overlap. Store each chunk with metadata: source, section, date, access group and version. Metadata lets you filter, cite and enforce permissions.

## Indexes

Comparing a query with millions of vectors is slow, so databases use **approximate nearest neighbor** indexes such as HNSW or IVF. They trade a little recall for large speed gains. Tune the search depth and measure recall against an exact search on a sample.

## Hybrid and evaluation

Pure vector search can miss exact terms like error codes and product names. **Hybrid search** combines keyword and vector scores. Build a small test set of real queries with known right documents and measure whether the right chunk appears in the top results, before and after each change to chunking or the model.

## Incident: The right document ranked tenth

> **Incident:** A support assistant could not find an answer that existed.

```console
query: "ERR-4031 payment declined"
top result: general payment FAQ
expected page ERR-4031 troubleshooting: rank 10
```

Vector search treated the error code as a rare word and returned general text. Adding keyword search for exact matches and boosting title matches put the right page first, and a test set of real tickets guarded against future regressions.

## Common mistakes

- Using only vector search for codes and names
- Chunks too large or cut mid-sentence
- No metadata or access filters
- Never measuring retrieval quality

```quiz
Q: What does cosine similarity measure?
+ The angle between vectors
- File size :: No.
- Network delay :: No.
- Token cost :: No.
> Closer directions mean closer meaning.

Q: Why use an ANN index?
+ Fast approximate search over many vectors
- Exact storage :: No.
- Encryption :: No.
- Compression only :: No.
> Speed matters at scale.

Q: Why add keyword search?
+ Exact terms may be missed by vectors
- It is cheaper only :: No.
- It removes metadata :: No.
- It trains models :: No.
> Hybrid improves recall.

Q: How judge retrieval?
+ A test set of real queries
- Looking at one example :: No.
- Model size :: No.
- Chunk count :: No.
> Measure the right result appears.
```

```cards
Embedding :: A vector representing the meaning of text
Cosine similarity :: Measure of vector direction similarity
HNSW :: Graph-based approximate nearest neighbor index
Hybrid search :: Combining keyword and vector search
```
