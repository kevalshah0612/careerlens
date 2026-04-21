// backend/src/services/llm.service.ts
// Real LLM using Google Gemini API
// Install: npm install @google/generative-ai

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// ─── Schema (same as mock) ────────────────────────────────────────────────────

export const SkillExtractionSchema = z.object({
  required_skills:  z.array(z.string()),
  preferred_skills: z.array(z.string()),
  experience_level: z.enum(['entry', 'mid', 'senior', 'lead']).nullable(),
  min_years:        z.number().nullable(),
  max_years:        z.number().nullable(),
  remote_policy:    z.string().nullable(),
  visa_sponsorship: z.boolean().nullable(),
  employment_type:  z.string().nullable(),
});

export type SkillExtraction = z.infer<typeof SkillExtractionSchema>;

// ─── Fallback (same logic as mock) ───────────────────────────────────────────
// Used when Gemini API fails or rate limits

const TECH_SKILLS = {
  languages: ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Ruby', 'C++', 'Rust', 'PHP', 'Swift', 'Kotlin'],
  frontend:  ['React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'HTML', 'CSS', 'Tailwind'],
  backend:   ['Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'FastAPI', 'Rails'],
  databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra'],
  cloud:     ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CloudFormation'],
  tools:     ['Git', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GraphQL', 'REST API', 'Microservices'],
  data:      ['Pandas', 'NumPy', 'Spark', 'Kafka', 'Airflow', 'ETL', 'Data Warehousing'],
};

function fallbackExtract(title: string, description: string): SkillExtraction {
  const combined = (title + ' ' + description).toLowerCase();
  const required_skills: string[]  = [];
  const preferred_skills: string[] = [];

  Object.values(TECH_SKILLS).flat().forEach(skill => {
    const skillLower = skill.toLowerCase();
    if (combined.includes(skillLower)) {
      const escaped = skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (combined.match(new RegExp(escaped, 'g')) || []).length;
      if (count > 1 || title.toLowerCase().includes(skillLower)) {
        required_skills.push(skill);
      } else {
        preferred_skills.push(skill);
      }
    }
  });

  let experience_level: 'entry' | 'mid' | 'senior' | 'lead' | null = null;
  if (combined.includes('senior') || combined.includes('sr.')) experience_level = 'senior';
  else if (combined.includes('lead') || combined.includes('principal')) experience_level = 'lead';
  else if (combined.includes('junior') || combined.includes('entry')) experience_level = 'entry';
  else if (combined.includes('mid')) experience_level = 'mid';
  else if (required_skills.length > 5) experience_level = 'senior';
  else if (required_skills.length > 2) experience_level = 'mid';

  const yearsMatch = combined.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  const min_years = yearsMatch ? parseInt(yearsMatch[1])
    : experience_level === 'senior' ? 5
    : experience_level === 'mid'    ? 2
    : experience_level === 'lead'   ? 8
    : null;

  let remote_policy: string | null = null;
  if (combined.includes('remote only')) remote_policy = 'remote';
  else if (combined.includes('hybrid')) remote_policy = 'hybrid';
  else if (combined.includes('remote')) remote_policy = 'remote';
  else if (combined.includes('on-site') || combined.includes('onsite')) remote_policy = 'onsite';

  let visa_sponsorship: boolean | null = null;
  if (combined.includes('h1b') || combined.includes('visa sponsor')) {
    visa_sponsorship = !combined.includes('no visa') && !combined.includes('not sponsor');
  }

  let employment_type: string | null = 'full-time';
  if (combined.includes('part-time'))  employment_type = 'part-time';
  else if (combined.includes('contract')) employment_type = 'contract';
  else if (combined.includes('intern'))   employment_type = 'internship';

  return {
    required_skills:  required_skills.slice(0, 8),
    preferred_skills: preferred_skills.slice(0, 5),
    experience_level,
    min_years,
    max_years: null,
    remote_policy,
    visa_sponsorship,
    employment_type,
  };
}

// ─── Gemini Client ────────────────────────────────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set in environment');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a job description parser. Extract structured information from job postings.
Return ONLY valid JSON matching this exact structure, no markdown, no explanation:
{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "experience_level": "entry" | "mid" | "senior" | "lead" | null,
  "min_years": number | null,
  "max_years": number | null,
  "remote_policy": "remote" | "hybrid" | "onsite" | null,
  "visa_sponsorship": true | false | null,
  "employment_type": "full-time" | "part-time" | "contract" | "internship" | null
}

Rules:
- required_skills: technologies explicitly required (max 8)
- preferred_skills: technologies listed as "nice to have" or "bonus" (max 5)
- experience_level: entry = 0-2 yrs, mid = 2-5 yrs, senior = 5+ yrs, lead = leadership roles
- visa_sponsorship: true only if explicitly stated they sponsor H1B/visas
- Return null for any field you cannot determine
- Only return the JSON object, nothing else`;

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function extractSkills(title: string, description: string): Promise<SkillExtraction> {
  // If no API key configured, fall back to mock silently
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.warn('GOOGLE_AI_API_KEY not set, using mock extraction');
    return fallbackExtract(title, description);
  }

  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `${SYSTEM_PROMPT}

Job Title: ${title}
Job Description: ${description.slice(0, 3000)}`; // Limit to 3000 chars to save tokens

    const result   = await model.generateContent(prompt);
    const response = await result.response;
    const text     = response.text().trim();

    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(clean);
    const validated = SkillExtractionSchema.parse(parsed);

    return validated;
  } catch (err: any) {
    // Log error but don't crash - fall back to mock extraction
    console.error(`Gemini extraction failed for "${title}": ${err.message}`);
    return fallbackExtract(title, description);
  }
}

// ─── Embedding (mock - Google embeddings are a separate API/cost) ─────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalized = text.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash = hash & hash;
  }

  const embedding: number[] = [];
  let seed = hash;
  const words = normalized.split(/\s+/).filter(w => w.length > 3);

  for (let i = 0; i < 1536; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    let value = (seed / 0x7fffffff) * 2 - 1;
    words.forEach((word, idx) => {
      const wordHash = word.charCodeAt(idx % word.length);
      if ((wordHash + i) % 100 < 10) value += (wordHash / 255) * 0.3;
    });
    embedding.push(Math.max(-1, Math.min(1, value)));
  }

  return embedding;
}

export function createSearchableText(job: {
  title: string;
  company: string;
  description: string;
  required_skills?: string[];
  preferred_skills?: string[];
}): string {
  return [
    job.title,
    job.company,
    job.description.slice(0, 1000),
    ...(job.required_skills  || []),
    ...(job.preferred_skills || []),
  ].join(' ').toLowerCase();
}

export async function batchExtractSkills(
  jobs: Array<{ title: string; description: string }>
): Promise<SkillExtraction[]> {
  const results: SkillExtraction[] = [];

  // Process one at a time to avoid rate limits on free tier
  // Gemini Flash free tier: 15 requests/minute
  for (const job of jobs) {
    results.push(await extractSkills(job.title, job.description));
    // Small delay between calls to stay within rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

console.log('🤖 Google Gemini LLM Service loaded (gemini-1.5-flash)');