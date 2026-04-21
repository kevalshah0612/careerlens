interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  location: { name: string };
  absolute_url: string;
  metadata: Array<{ name: string; value: string }>;
  content?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export async function fetchGreenhouseJobs(company: string): Promise<any[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json() as GreenhouseResponse;
    
    return (data.jobs || []).map(job => ({
      externalId: `gh-${job.id}`,
      source: 'greenhouse',
      title: job.title,
      company: company,
      location: job.location?.name || 'Not specified',
      description: job.content || '',
      postedAt: new Date(job.updated_at),
      url: job.absolute_url,
      dateReliable: false, // Greenhouse uses updated_at, not posted date
      employmentType: job.metadata?.find(m => m.name === 'Employment Type')?.value || 'Full-time',
    }));
  } catch (error) {
    console.error(`Greenhouse fetch error for ${company}:`, error);
    return [];
  }
}
