import { z } from 'zod';

// Schema for skill extraction
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

// Common tech skills database
const TECH_SKILLS = {
  languages: ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Ruby', 'C++', 'Rust', 'PHP', 'Swift', 'Kotlin'],
  frontend:  ['React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'HTML', 'CSS', 'Tailwind'],
  backend:   ['Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'FastAPI', 'Rails'],
  databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra'],
  cloud:     ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CloudFormation'],
  tools:     ['Git', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GraphQL', 'REST API', 'Microservices'],
  data:      ['Pandas', 'NumPy', 'Spark', 'Kafka', 'Airflow', 'ETL', 'Data Warehousing'],
};

export async function extractSkills(title: string, description: string): Promise<SkillExtraction> {
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
  if (combined.includes('senior') || combined.includes('sr.'))        experience_level = 'senior';
  else if (combined.includes('lead') || combined.includes('principal')) experience_level = 'lead';
  else if (combined.includes('junior') || combined.includes('entry'))  experience_level = 'entry';
  else if (combined.includes('mid'))                                    experience_level = 'mid';
  else if (required_skills.length > 5)                                 experience_level = 'senior';
  else if (required_skills.length > 2)                                 experience_level = 'mid';

  const yearsMatch = combined.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  const min_years = yearsMatch          ? parseInt(yearsMatch[1])
    : experience_level === 'senior'     ? 5
    : experience_level === 'mid'        ? 2
    : experience_level === 'lead'       ? 8
    : null;

  let remote_policy: string | null = null;
  if (combined.includes('remote only'))                                  remote_policy = 'remote';
  else if (combined.includes('hybrid'))                                  remote_policy = 'hybrid';
  else if (combined.includes('remote'))                                  remote_policy = 'remote';
  else if (combined.includes('on-site') || combined.includes('onsite')) remote_policy = 'onsite';

  let visa_sponsorship: boolean | null = null;
  if (combined.includes('h1b') || combined.includes('visa sponsor')) {
    visa_sponsorship = !combined.includes('no visa') && !combined.includes('not sponsor');
  }

  let employment_type: string | null = 'full-time';
  if (combined.includes('part-time'))      employment_type = 'part-time';
  else if (combined.includes('contract'))  employment_type = 'contract';
  else if (combined.includes('intern'))    employment_type = 'internship';

  await new Promise(resolve => setTimeout(resolve, 10));

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

  await new Promise(resolve => setTimeout(resolve, 50));
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
  const batchSize = 5;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    results.push(...await Promise.all(batch.map(job => extractSkills(job.title, job.description))));
    if (i + batchSize < jobs.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  return results;
}

console.log('✅ MOCK LLM Service loaded (FREE - no API key needed)');