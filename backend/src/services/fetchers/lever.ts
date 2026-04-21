interface LeverJob {
  id: string;
  text: string;
  categories: { location?: string; commitment?: string };
  createdAt: number;
  hostedUrl: string;
  description: string;
}

export async function fetchLeverJobs(company: string): Promise<any[]> {
  try {
    const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }

    const jobs = await response.json() as LeverJob[];
    
    return jobs.map(job => ({
      externalId: `lever-${job.id}`,
      source: 'lever',
      title: job.text,
      company: company,
      location: job.categories?.location || 'Not specified',
      description: job.description || '',
      postedAt: new Date(job.createdAt),
      url: job.hostedUrl,
      dateReliable: true,
      employmentType: job.categories?.commitment || 'Full-time',
    }));
  } catch (error) {
    console.error(`Lever fetch error for ${company}:`, error);
    return [];
  }
}
