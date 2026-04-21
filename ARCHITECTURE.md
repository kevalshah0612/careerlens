# JOB PULSE ARCHITECTURE DIAGRAM

## System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│                                                                       │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │  React Frontend  │         │   Mobile App     │                 │
│  │   (TypeScript)   │         │   (Future)       │                 │
│  └────────┬─────────┘         └────────┬─────────┘                 │
│           │                             │                            │
│           └─────────────┬───────────────┘                            │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
                          │ HTTPS/REST
                          │
┌─────────────────────────▼────────────────────────────────────────────┐
│                        API LAYER                                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Fastify REST API (TypeScript)                     │ │
│  │                                                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │  Tenant     │  │   Auth      │  │  Rate       │          │ │
│  │  │  Middleware │→ │  Validation │→ │  Limiting   │          │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  │                                                                │ │
│  │  Routes:                                                       │ │
│  │  • GET  /api/v1/jobs              [List & Filter]            │ │
│  │  • POST /api/v1/jobs/search       [Semantic Search]          │ │
│  │  • GET  /api/v1/jobs/:id          [Single Job]               │ │
│  │  • GET  /api/v1/stats             [Dashboard]                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│           │                    │                    │                │
└───────────┼────────────────────┼────────────────────┼────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐
│   CACHE LAYER     │  │   SERVICE LAYER   │  │   QUEUE LAYER    │
│                   │  │                   │  │                  │
│  ┌─────────────┐  │  │  ┌─────────────┐ │  │  ┌────────────┐  │
│  │   Redis     │  │  │  │ Job Service │ │  │  │  BullMQ    │  │
│  │             │  │  │  │   • CRUD    │ │  │  │  Workers   │  │
│  │ • Jobs      │  │  │  │   • Search  │ │  │  │            │  │
│  │ • Searches  │  │  │  │   • Stats   │ │  │  │ • Fetch    │  │
│  │ • Sessions  │  │  │  └─────────────┘ │  │  │ • Extract  │  │
│  │             │  │  │  ┌─────────────┐ │  │  │ • Embed    │  │
│  │ TTL: 5min   │  │  │  │ LLM Service │ │  │  └────────────┘  │
│  └─────────────┘  │  │  │   • Extract │ │  │                  │
│                   │  │  │   • Embed   │ │  │  Concurrency: 5  │
└───────────────────┘  │  └─────────────┘ │  └──────────────────┘
                       │  ┌─────────────┐ │
                       │  │  Fetchers   │ │
                       │  │ • Greenhouse│ │
                       │  │ • Lever     │ │
                       │  │ • Ashby     │ │
                       │  └─────────────┘ │
                       └───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           PostgreSQL 15 + pgvector Extension                   │ │
│  │                                                                │ │
│  │  Tables:                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐             │ │
│  │  │ tenants  │  │   jobs   │  │ job_fetch_logs │             │ │
│  │  │          │  │          │  │                │             │ │
│  │  │ • id     │  │ • id     │  │ • source       │             │ │
│  │  │ • name   │  │ • tenant │  │ • fetched      │             │ │
│  │  │ • config │  │ • title  │  │ • errors       │             │ │
│  │  └──────────┘  │ • skills │  └────────────────┘             │ │
│  │                │ • vector │                                   │ │
│  │                │   (1536) │                                   │ │
│  │                └──────────┘                                   │ │
│  │                                                                │ │
│  │  Indexes:                                                      │ │
│  │  • tenant_id, posted_at (compound)                            │ │
│  │  • company, source, experience_level                          │ │
│  │  • vector (IVFFlat for similarity search)                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                                │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   OpenAI     │  │  Greenhouse  │  │    Lever     │             │
│  │              │  │     ATS      │  │     ATS      │             │
│  │ • GPT-3.5    │  │              │  │              │             │
│  │ • Embeddings │  │  Public API  │  │  Public API  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                       │
│  ┌──────────────┐                                                    │
│  │    Ashby     │                                                    │
│  │     ATS      │                                                    │
│  │  Public API  │                                                    │
│  └──────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Job Fetching & Processing

```
START: Scheduled Job Fetch (Every 3 minutes)
│
├─ Step 1: Worker receives fetch task from BullMQ queue
│   ├─ Task: { source: 'greenhouse', company: 'stripe', tenant: 'xxx' }
│   └─ Concurrency: 5 workers processing in parallel
│
├─ Step 2: Fetch jobs from ATS API
│   ├─ Call: https://api.greenhouse.io/v1/boards/stripe/jobs
│   ├─ Response: Array of job listings
│   └─ Filter: Posted within last 24 hours
│
├─ Step 3: LLM Skill Extraction (for each job)
│   ├─ Input: Job title + description (unstructured text)
│   ├─ OpenAI API: GPT-3.5-turbo with JSON mode
│   ├─ Prompt: "Extract skills, experience level, visa info..."
│   └─ Output: { required_skills: [], experience_level: 'senior', ... }
│
├─ Step 4: Generate Vector Embedding
│   ├─ Combine: title + description + skills → searchable text
│   ├─ OpenAI API: text-embedding-3-small
│   └─ Output: [0.123, -0.456, ...] (1536 dimensions)
│
├─ Step 5: Store in PostgreSQL
│   ├─ Upsert job record (prevent duplicates)
│   ├─ Store embedding as vector(1536) type
│   └─ Index on tenant_id, posted_at, company
│
└─ Step 6: Cache invalidation
    └─ Clear Redis cache for affected tenant
│
END: Job available for search
```

## Data Flow: Semantic Search

```
START: User searches "React developer with AWS experience"
│
├─ Step 1: API receives search request
│   ├─ POST /api/v1/jobs/search
│   ├─ Headers: X-Tenant-ID: abc123
│   └─ Body: { query: "React developer with AWS", filters: {...} }
│
├─ Step 2: Check Redis cache
│   ├─ Key: search:abc123:React developer with AWS:...
│   ├─ TTL: 5 minutes
│   └─ Cache HIT → Return cached results (skip to Step 6)
│       Cache MISS → Continue to Step 3
│
├─ Step 3: Generate query embedding
│   ├─ OpenAI API: text-embedding-3-small
│   ├─ Input: "React developer with AWS experience"
│   └─ Output: [0.789, -0.321, ...] (1536 dimensions)
│
├─ Step 4: Vector similarity search
│   ├─ SQL: SELECT * FROM jobs WHERE tenant_id = 'abc123'
│   │       ORDER BY embedding <=> '[0.789,-0.321,...]'::vector
│   │       LIMIT 20
│   ├─ pgvector: Cosine similarity using <=> operator
│   ├─ Index: IVFFlat for fast approximate search
│   └─ Result: Jobs ranked by similarity (0.0 to 1.0)
│
├─ Step 5: Apply additional filters
│   ├─ Location: Contains "San Francisco"
│   ├─ Remote: true
│   └─ Experience: "mid" or "senior"
│
├─ Step 6: Cache results in Redis
│   ├─ Key: search:abc123:React developer with AWS:...
│   ├─ Value: JSON array of jobs with similarity scores
│   └─ TTL: 300 seconds (5 minutes)
│
└─ Step 7: Return to client
    └─ Response: { query, jobs: [...], count: 20 }
│
END: Results displayed with match percentages
```

## Multi-Tenant Isolation

```
Request Flow with Tenant Validation:

Client Request
│
├─ HTTP Header: X-Tenant-ID: abc-123-def
│
▼
┌─────────────────────────────────┐
│    Fastify Middleware (Auth)    │
│                                 │
│  1. Extract X-Tenant-ID header  │
│  2. Lookup tenant in database   │
│  3. Validate tenant exists      │
│  4. Attach to request context   │
│                                 │
│  IF invalid → 401 Unauthorized  │
│  IF missing → 401 Missing header│
└─────────────────────────────────┘
│
▼
┌─────────────────────────────────┐
│     Route Handler (API)         │
│                                 │
│  const tenant = request.tenant  │
│                                 │
│  prisma.job.findMany({          │
│    where: {                     │
│      tenantId: tenant.id  ← ENFORCED │
│    }                            │
│  })                             │
└─────────────────────────────────┘
│
▼
Database Query Always Filtered by tenant_id
```

## Performance Optimization Strategy

```
Request: GET /api/v1/jobs?page=1&limit=20

┌─────────────────────────────────────────────┐
│  Step 1: Check Redis Cache                  │
│  Key: jobs:abc123:page1:limit20:filters...  │
│  ├─ HIT  → Return in <10ms                  │
│  └─ MISS → Continue to database             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Step 2: Database Query with Indexes        │
│                                             │
│  Index Used: tenant_id_posted_at_idx       │
│  Execution Time: 50-100ms                  │
│                                             │
│  SELECT * FROM jobs                         │
│  WHERE tenant_id = 'abc123'                │
│  ORDER BY posted_at DESC                   │
│  LIMIT 20 OFFSET 0                         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Step 3: Cache Result in Redis              │
│  TTL: 300 seconds (5 minutes)               │
│  Next request: <10ms                        │
└─────────────────────────────────────────────┘
                    │
                    ▼
            Return to Client
         Total Time: <100ms
```

## Deployment Architecture (Azure)

```
                    Internet
                        │
                        ▼
            ┌───────────────────────┐
            │   Azure Front Door    │
            │   (CDN + WAF)         │
            └───────────┬───────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Azure Static Web   │  │  Azure App Service  │
│  Apps (Frontend)    │  │  (Backend API)      │
│                     │  │                     │
│  • React build      │  │  • Node.js 20       │
│  • Auto-scaling     │  │  • Auto-scaling     │
└─────────────────────┘  │  • Health checks    │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌──────────────┐  ┌─────────────┐  ┌─────────────┐
         │   Azure      │  │   Azure     │  │   Azure     │
         │  PostgreSQL  │  │   Redis     │  │  Functions  │
         │              │  │   Cache     │  │  (Workers)  │
         │ • Managed    │  │             │  │             │
         │ • Backups    │  │ • Premium   │  │ • Timer     │
         │ • Replicas   │  │ • Cluster   │  │   Trigger   │
         └──────────────┘  └─────────────┘  └─────────────┘
```

## How This Maps to SideCoach Architecture

```
Job Pulse Component          →    SideCoach Equivalent
─────────────────────────────────────────────────────────
Multi-tenant isolation       →    University-specific portals
Job listings with filters    →    Camp catalogs with search
Semantic job search          →    Athlete-coach matching
LLM skill extraction         →    Parse coach credentials
Background job fetching      →    Email notifications, reports
Redis caching               →    Cache camp availability
pgvector search             →    "Find coaches near me"
Tenant config (JSON)        →    University branding/settings
RESTful API                 →    Mobile app + web API
```

Print this diagram and bring it to the interview! 
