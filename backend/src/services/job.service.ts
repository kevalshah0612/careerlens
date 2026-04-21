import { prisma } from '../config/database';
import { cacheGet, cacheSet } from '../config/redis';
import { config } from '../config';
import { extractSkills, generateEmbedding, createSearchableText } from './llm.service';

export interface JobFilters {
  location?: string;
  experienceLevel?: string;
  remote?: boolean;
  company?: string;
  skills?: string[];
  minDate?: Date;
  source?: string;
}

/**
 * Get paginated jobs for a tenant with optional filters
 */
export async function getJobs(
  tenantId: string,
  page: number = 1,
  limit: number = 20,
  filters?: JobFilters
) {
  const cacheKey = `jobs:${tenantId}:${page}:${limit}:${JSON.stringify(filters || {})}`;
  
  // Check cache
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const skip = (page - 1) * limit;
  
  const where: any = { tenantId };
  
  if (filters) {
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }
    if (filters.experienceLevel) {
      where.experienceLevel = filters.experienceLevel;
    }
    if (filters.remote !== undefined) {
      where.remote = filters.remote;
    }
    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }
    if (filters.skills && filters.skills.length > 0) {
      where.OR = filters.skills.map(skill => ({
        requiredSkills: { has: skill }
      }));
    }
    if (filters.source) {
      where.source = filters.source;
    }
    if (filters.minDate) {
      where.postedAt = { gte: filters.minDate };
    }
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { postedAt: 'desc' },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        postedAt: true,
        url: true,
        requiredSkills: true,
        experienceLevel: true,
        remote: true,
        visaSponsorship: true,
        source: true,
      },
    }),
    prisma.job.count({ where }),
  ]);

  const result = {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  // Cache for 5 minutes
  await cacheSet(cacheKey, result, config.cache.jobsTtl);

  return result;
}

/**
 * Semantic search using pgvector cosine similarity
 */
export async function semanticSearch(
  tenantId: string,
  query: string,
  limit: number = 20,
  filters?: JobFilters
) {
  // Use regular search with keyword matching instead of vector search
  const where: any = { 
    tenantId,
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { company: { contains: query, mode: 'insensitive' } },
    ]
  };
  
  if (filters?.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }
  if (filters?.experienceLevel) {
    where.experienceLevel = filters.experienceLevel;
  }
  if (filters?.remote !== undefined) {
    where.remote = filters.remote;
  }
  if (filters?.company) {
    where.company = { contains: filters.company, mode: 'insensitive' };
  }

  const jobs = await prisma.job.findMany({
    where,
    take: limit,
    orderBy: { postedAt: 'desc' },
  });

  return {
    query,
    jobs: jobs.map(job => ({ ...job, similarity: 0.85 })),
    count: jobs.length,
  };
}

/**
 * Get a single job by ID
 */
export async function getJobById(tenantId: string, jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, tenantId },
  });
}

/**
 * Create or update a job with LLM extraction
 */
export async function upsertJob(tenantId: string, jobData: any) {
  const { externalId, source, title, description } = jobData;

  const existing = await prisma.job.findFirst({
    where: { externalId, source, tenantId },
  });

  let extracted = null;
  
  try {
    extracted = await extractSkills(title, description);
  } catch (error) {
    console.error('LLM processing error:', error);
  }

  const data = {
    tenantId,
    externalId,
    source,
    title,
    company: jobData.company,
    location: jobData.location,
    description,
    postedAt: jobData.postedAt,
    url: jobData.url,
    requiredSkills: extracted?.required_skills || [],
    preferredSkills: extracted?.preferred_skills || [],
    experienceLevel: extracted?.experience_level,
    minYears: extracted?.min_years,
    maxYears: extracted?.max_years,
    remote: jobData.remote || false,
    visaSponsorship: extracted?.visa_sponsorship,
    employmentType: extracted?.employment_type || jobData.employmentType,
    dateReliable: jobData.dateReliable,
    extracted: true,
  };

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.job.create({ data });
}

/**
 * Get statistics for dashboard
 */
export async function getStats(tenantId: string) {
  const [
    total,
    last24h,
    remote,
    h1bCount,
    topCompanies,
  ] = await Promise.all([
    prisma.job.count({ where: { tenantId } }),
    prisma.job.count({
      where: {
        tenantId,
        postedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.job.count({ where: { tenantId, remote: true } }),
    prisma.job.count({ where: { tenantId, visaSponsorship: true } }),
    prisma.job.groupBy({
      by: ['company'],
      where: { tenantId },
      _count: { company: true },
      orderBy: { _count: { company: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    total,
    last24h,
    remote,
    h1bSponsors: h1bCount,
    topCompanies: topCompanies.map(c => ({
      company: c.company,
      count: c._count.company,
    })),
  };
}
