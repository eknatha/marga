## How do you share GPUs?
level: mid
MIG for hard isolation on supported cards, time slicing for light shared use, and whole GPUs for heavy jobs. I match the method to isolation and cost needs.

## When do you need a vector database?
level: mid
For similarity search at scale. For smaller data pgvector in PostgreSQL is simpler, and a dedicated store helps with scale, filtering and operations features. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## What makes a RAG system reliable?
level: mid
Good chunking and metadata, fresh ingestion, retrieval evaluation, citations, guardrails and monitoring of answer quality. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## What does an LLM gateway do?
level: mid
Central routing, authentication, rate limits, caching, fallbacks, logging and cost tracking across models and providers. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you evaluate LLM quality?
level: senior
Maintain test sets, run them on each change, score with checks and model graders, sample real traffic and track regressions. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you control inference cost?
level: senior
Right size models, batch and cache, scale on queue depth, use spot for batch work and track cost per request. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.
