---
title: Retrieval-augmented generation (RAG)
minutes: 13
summary: Give a model fresh, private knowledge by retrieving relevant text and putting it in the prompt, with citations and checks against made-up answers.
---

A language model knows what was in its training data and nothing about your wiki, tickets or last week's decisions. Retrieval-augmented generation bridges that gap without retraining.

## What you will learn

- The RAG pipeline: ingest, retrieve, generate
- Prompting for grounded, cited answers
- Handling no results and conflicting sources
- Evaluating retrieval and answers separately

## The pipeline

1. **Ingest:** load documents, clean them, chunk them, embed them and store them with metadata.
2. **Retrieve:** embed the question, find the top chunks, and optionally rerank them.
3. **Generate:** build a prompt with the chunks and ask the model to answer from them.

```python
def rag_answer(question, user, search, llm):
    chunks = search(question, top_k=6, filter={"groups": user.groups})
    if not chunks:
        return "I could not find this in the documentation."
    context = "\n\n".join(f"[{c.id}] {c.text}" for c in chunks)
    prompt = (
        "Use only the context to answer. Cite the ids you used like [id]. "
        "If the context does not answer the question, say so.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )
    return llm(prompt)
```

## Grounded answers

Tell the model to use only the context, cite sources and admit gaps. Put the context in a clearly marked section. Handle conflicts by preferring newer or higher-authority documents, and show dates.

## Access control

Apply permissions at **retrieval time** with metadata filters, not only in the prompt. A model cannot keep a secret that you put in its context.

## Evaluate in two parts

Measure **retrieval** (did the right chunk appear in the top results) and **generation** (is the answer correct and faithful to the chunks). When quality drops, this tells you whether to improve chunking, search or prompts. Keep a regression set and update documents on a schedule, since stale sources create confident wrong answers.

## Incident: The assistant that quoted a confidential file

> **Incident:** Retrieval ignored permissions and exposed a restricted document.

```console
user: contractor
retrieved: finance/salary-bands.md
answer included salary ranges
```

The index held every document and relied on the prompt to keep secrets. A contractor's question retrieved a restricted file. The team added group metadata and filtered at query time, tested access with sample users and logged which documents were used.

## Common mistakes

- Enforcing access only in the prompt
- No answer when nothing relevant is found
- Never refreshing stale documents
- Measuring only final answers, not retrieval

```quiz
Q: What does RAG add to a model?
+ Retrieved private or current text
- New weights :: No.
- More GPUs :: No.
- A new tokenizer :: No.
> Context comes from documents.

Q: Where enforce document access?
+ At retrieval with filters
- Only in the prompt :: No.
- Nowhere :: No.
- In the answer :: No.
> The model sees what you give it.

Q: What should the model do without relevant context?
+ Say it cannot find the answer
- Guess :: No.
- Invent a source :: No.
- Ignore the question :: No.
> Honesty beats invention.

Q: Why evaluate retrieval separately?
+ It shows where quality is lost
- It is cheaper :: No.
- It removes tests :: No.
- It changes prompts :: No.
> Diagnose the stage. The lesson section above explains why.
```

```cards
RAG :: Retrieval-augmented generation
Reranking :: Reordering retrieved chunks by relevance
Faithfulness :: Whether an answer matches its sources
Metadata filter :: Restricts retrieval by attributes
```
