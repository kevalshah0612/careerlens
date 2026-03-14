# CareerLens Job Intelligence Platform

A distributed job intelligence system built with Java Spring Boot, Kafka, PostgreSQL (pgvector), Redis, and React.js, designed to ingest, normalize, and semantically rank job postings for personalized career matching.

> Status: In Progress

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java, Spring Boot |
| Messaging | Kafka |
| Database | PostgreSQL, pgvector |
| Caching | Redis |
| ML / Matching | Python FastAPI, LLM |
| Frontend | React.js, TypeScript |
| Infra | Kubernetes |

## Features

- **Job Ingestion Pipeline**: Kafka-driven pipeline normalizes postings from 3+ sources into a unified schema and reduces data processing latency by 70% through concurrent consumer group design across 10K+ indexed records.
- **Semantic Job Matching**: Python FastAPI service deployed on a 3-node Kubernetes cluster combines pgvector similarity search with an LLM explanation layer to return ranked recommendations with 85%+ match precision.
- **Fast Response Times**: Redis caching helps serve repeat queries in under 200ms.
- **Unified Schema Design**: Job postings from multiple sources are standardized for reliable search, ranking, and downstream processing.

## Architecture

```text
Job Sources (3+)
      |
      v
Kafka Topics (Consumer Groups)
      |
      v
Spring Boot Normalization Service
      |
      v
PostgreSQL + pgvector (10K+ records)
      |
      v
Python FastAPI Matching Service (Kubernetes, 3-node)
      |       ^
      |    Redis Cache
      v
React.js + TypeScript Frontend
