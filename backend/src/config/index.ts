import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    useKafka: process.env.USE_KAFKA === 'true',
  },
  
  jobFetching: {
    hoursFilter: parseInt(process.env.HOURS_FILTER || '24'),
    atsBatchSize: parseInt(process.env.ATS_BATCH_SIZE || '8'),
    atsDelayMs: parseInt(process.env.ATS_DELAY_MS || '100'),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '180000'),
  },
  
  cache: {
    jobsTtl: parseInt(process.env.CACHE_JOBS_TTL || '300'),
    searchTtl: parseInt(process.env.CACHE_SEARCH_TTL || '300'),
  },
};

// H1B Sponsor Companies (Big Tech + Enterprise)
export const H1B_COMPANIES = [
  'microsoft', 'meta', 'google', 'amazon', 'apple', 'netflix', 'oracle', 
  'ibm', 'salesforce', 'adobe', 'intuit', 'servicenow', 'workday', 
  'snowflake', 'databricks', 'stripe', 'coinbase', 'robinhood', 'airbnb', 
  'uber', 'lyft', 'doordash', 'instacart', 'square', 'twilio', 'shopify',
  'atlassian', 'mongodb', 'elastic', 'confluent', 'hashicorp', 'datadog',
  'splunk', 'pagerduty', 'okta', 'auth0', 'cloudflare', 'fastly',
];

export const RSS_FEEDS: { name: string; url: string }[] = [
  {
    name: 'google-alerts-swe-usa-1',
    url: 'https://www.google.com/alerts/feeds/05573539628640145371/5876885471080705793',
  },
  {
    name: 'google-alerts-swe-usa-2',
    url: 'https://www.google.com/alerts/feeds/05573539628640145371/17154616261530638308',
  },
];

// Greenhouse Companies (Most Popular ATS)
export const GREENHOUSE_COMPANIES = [
  // AI/ML Companies
  'openai', 'anthropic', 'huggingface', 'cohere', 'stability-ai',
  
  // Fintech
  'stripe', 'ramp', 'brex', 'coinbase', 'robinhood', 'plaid', 'mercury',
  'square', 'affirm', 'chime', 'wise', 'revolut',
  
  // Productivity & Collaboration
  'notion', 'figma', 'airtable', 'asana', 'linear', 'loom', 'miro',
  'canva', 'grammarly', 'dropbox', 'box', 'zoom', 'calendly',
  
  // Infrastructure & DevTools
  'github', 'gitlab', 'cloudflare', 'datadog', 'grafana', 'hashicorp',
  'mongodb', 'elastic', 'confluent', 'redis', 'neo4j', 'cockroach-labs',
  
  // Consumer Tech
  'discord', 'reddit', 'pinterest', 'snap', 'tiktok', 'spotify', 'soundcloud',
  
  // E-commerce & Marketplace
  'shopify', 'instacart', 'doordash', 'gopuff', 'faire', 'flexport',
  
  // Enterprise SaaS
  'rippling', 'gusto', 'carta', 'lattice', 'greenhouse', 'ashbyhq',
  'workos', 'segment', 'amplitude', 'mixpanel', 'launchdarkly',
  
  // Healthcare & Biotech
  'tempus', 'devoted-health', 'oscar-health', 'ro', 'hims-hers',
  
  // Security & Compliance
  'wiz', 'snyk', 'vanta', 'drata', 'secureframe', 'verkada',
  
  // Gaming & Entertainment
  'roblox', 'epic-games', 'activision', 'riot-games',
];

// Lever Companies
export const LEVER_COMPANIES = [
  // Big Tech on Lever
  'netflix', 'uber', 'lyft', 'twitter', 'grubhub', 'postmates',
  
  // Defense & Aerospace
  'palantir', 'anduril', 'spacex', 'relativity-space', 'axiom-space',
  
  // Developer Tools
  'retool', 'vercel', 'linear', 'postman', 'sourcegraph', 'replicate',
  
  // Real Estate Tech
  'zillow', 'redfin', 'opendoor', 'compass', 'better',
  
  // Transportation & Logistics
  'flexport', 'convoy', 'samsara', 'nuro', 'cruise',
  
  // Social & Community
  'nextdoor', 'bumble', 'hinge', 'meetup', 'eventbrite',
  
  // EdTech
  'coursera', 'udemy', 'duolingo', 'outschool', 'masterclass',
  
  // Climate & Clean Tech
  'rivian', 'lucid-motors', 'northvolt', 'watershed', 'climeworks',
];

// Ashby Companies (Modern ATS - Startups)
export const ASHBY_COMPANIES = [
  // AI/ML Startups
  'openai', 'anthropic', 'perplexity', 'cohere', 'replicate', 'together-ai',
  'modal', 'runway', 'mistral', 'character-ai', 'adept', 'inflection',
  
  // Fintech Startups
  'ramp', 'mercury', 'brex', 'unit', 'column', 'increase',
  
  // Developer Tools
  'vercel', 'linear', 'plane', 'dbt-labs', 'dagster', 'prefect',
  'temporal', 'airplane', 'incident-io',
  
  // Infrastructure
  'fly-io', 'render', 'railway', 'northflank', 'supabase', 'neon',
  
  // Data & Analytics
  'hex', 'omni', 'metabase', 'preset', 'census', 'hightouch',
  
  // Security
  'vanta', 'drata', 'secureframe', 'normalyze', 'wiz',
  
  // Productivity
  'linear', 'height', 'mem', 'reflect', 'routine',
];