CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS jobs (
    id              VARCHAR(100) PRIMARY KEY,
    title           VARCHAR(500),
    company         VARCHAR(300),
    location        VARCHAR(300),
    url             TEXT,
    summary         TEXT,
    source          VARCHAR(100),
    job_type        VARCHAR(100),
    has_remote      BOOLEAN DEFAULT FALSE,
    salary_min      VARCHAR(50),
    salary_max      VARCHAR(50),
    published_at    VARCHAR(100),
    search_tag      VARCHAR(100),
    ai_summary      TEXT,
    match_score     INTEGER,
    embedding       vector(768),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_embedding_idx
    ON jobs USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_jobs_published  ON jobs (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source     ON jobs (source);
CREATE INDEX IF NOT EXISTS idx_jobs_company    ON jobs (company);
CREATE INDEX IF NOT EXISTS idx_jobs_created    ON jobs (created_at DESC);