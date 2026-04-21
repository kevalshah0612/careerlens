import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { config, GREENHOUSE_COMPANIES, LEVER_COMPANIES, ASHBY_COMPANIES, RSS_FEEDS } from '../config';
import { fetchGreenhouseJobs } from '../services/fetchers/greenhouse';
import { fetchLeverJobs } from '../services/fetchers/lever';
import { fetchAshbyJobs } from '../services/fetchers/ashby';
import { fetchRssFeed } from '../services/fetchers/rss';
import { upsertJob } from '../services/job.service';
import { extractSkills } from '../services/llm.service.mock'; // swap to llm.service.mock for free mode

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue('job-fetching', { connection: redis });

// =====================================================
// JOB FILTERS
// =====================================================

const TARGET_ROLES = {
  softwareEngineer: [
    'software engineer',
    'software developer',
    'backend engineer',
    'backend developer',
    'frontend engineer',
    'frontend developer',
    'java developer',
    'software engineer intern',
    'software developer intern',
    'backend engineer intern',
    'backend developer intern',
    'software development engineer',
  ],
  fullStack: [
    'full stack',
    'fullstack',
    'full-stack engineer',
    'full-stack developer',
  ],
  aiMl: [
    'machine learning',
    'ml engineer',
    'ai engineer',
  ],
};

const EXCLUDED_KEYWORDS = [
  'senior',
  'sr.',
  'sr ',
  'lead',
  'principal',
  'staff',
  'director',
  'manager',
  'vp',
  'chief',
  'head of',
  '5+ years',
  '6+ years',
  '7+ years',
  '8+ years',
  '10+ years',
];

function isTargetJob(job: any): boolean {
  const title    = (job.title || '').toLowerCase();
  const combined = `${title} ${(job.description || '').toLowerCase()}`;

  const matchesRole = Object.values(TARGET_ROLES).some(keywords =>
    keywords.some(keyword => title.includes(keyword))
  );
  if (!matchesRole) return false;

  const hasBadKeyword = EXCLUDED_KEYWORDS.some(keyword => title.includes(keyword));
  if (hasBadKeyword) return false;

  const isFullTime = !combined.includes('part-time') && !combined.includes('contract');
  if (!isFullTime) return false;

  return true;
}

// =====================================================
// WORKER LOGIC
// =====================================================

const worker = new Worker(
  'job-fetching',
  async (job) => {
    const { source, company, tenantId, feedUrl } = job.data;
    console.log(`Fetching ${source} jobs for ${company}...`);

    try {
      let jobs: any[] = [];

      if (source === 'greenhouse') {
        jobs = await fetchGreenhouseJobs(company);
      } else if (source === 'lever') {
        jobs = await fetchLeverJobs(company);
      } else if (source === 'ashby') {
        jobs = await fetchAshbyJobs(company);
      } else if (source === 'google_alerts') {
        jobs = await fetchRssFeed(feedUrl, company);
      }

      // Filter to target roles only
      const targetJobs = jobs.filter(isTargetJob);
      console.log(`Found ${jobs.length} total jobs, ${targetJobs.length} match your criteria`);

      // Process each job: extract skills via Gemini, then save to DB
      let successful = 0;

      for (const jobData of targetJobs) {
        try {
          // Extract structured data from job title + description using Gemini
          const extracted = await extractSkills(
            jobData.title,
            jobData.description || ''
          );

          await upsertJob(tenantId, {
            ...jobData,
            requiredSkills:  extracted.required_skills,
            experienceLevel: extracted.experience_level,
            // Merge remote from LLM + original source data (either can detect it)
            remote:          extracted.remote_policy === 'remote' || jobData.remote || false,
            visaSponsorship: extracted.visa_sponsorship ?? jobData.visaSponsorship ?? false,
          });

          successful++;
        } catch (error) {
          console.error(`Failed to process job "${jobData.title}":`, error);
        }
      }

      console.log(`✅ Processed ${successful}/${targetJobs.length} jobs for ${company}`);
      return { company, source, total: jobs.length, filtered: targetJobs.length, successful };

    } catch (error) {
      console.error(`Error fetching ${source} jobs for ${company}:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

// =====================================================
// SCHEDULER
// =====================================================

export async function scheduleJobFetching() {
  const tenantId = 'b1e343fb-5e88-403c-afca-d12c78cb7914';

  for (const company of GREENHOUSE_COMPANIES) {
    await jobQueue.add('fetch', { source: 'greenhouse', company, tenantId });
  }

  for (const company of LEVER_COMPANIES) {
    await jobQueue.add('fetch', { source: 'lever', company, tenantId });
  }

  for (const company of ASHBY_COMPANIES) {
    await jobQueue.add('fetch', { source: 'ashby', company, tenantId });
  }

  for (const feed of RSS_FEEDS) {
    await jobQueue.add('fetch', {
      source: 'google_alerts',
      company: feed.name,
      feedUrl: feed.url,
      tenantId,
    });
  }

  console.log(`🔄 Job fetching scheduled (${RSS_FEEDS.length} RSS feeds included)`);
}

scheduleJobFetching();
setInterval(scheduleJobFetching, config.jobFetching.pollIntervalMs);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

console.log('🚀 Job fetcher worker started');
console.log('🎯 Filtering for: Software Engineer, Full Stack, AI/ML roles');
console.log('🚫 Excluding: Senior, Lead, Principal, Staff, Director');
console.log(`📡 RSS feeds configured: ${RSS_FEEDS.length}`);
console.log('🤖 LLM: Google Gemini (falls back to mock if API key missing)');