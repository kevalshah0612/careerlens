interface AshbyJob {
  id: string;
  title: string;
  location: string;
  publishedAt: string;
  isListed: boolean;
  jobUrl: string;
  descriptionPlain?: string;
  isRemote: boolean;
  employmentType?: string;
  workplaceType?: string;
}

interface AshbyResponse {
  jobs: AshbyJob[];
  organization?: { name: string };
}

export async function fetchAshbyJobs(company: string): Promise<any[]> {
  try {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${company}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json() as AshbyResponse;
    
    return (data.jobs || [])
      .filter(job => job.isListed !== false)
      .map(job => ({
        externalId: `ashby-${job.id}`,
        source: 'ashby',
        title: job.title,
        company: data.organization?.name || company,
        location: job.location || 'Not specified',
        description: job.descriptionPlain || '',
        postedAt: new Date(job.publishedAt),
        url: job.jobUrl,
        dateReliable: true,
        remote: job.isRemote || job.workplaceType === 'Remote',
        employmentType: job.employmentType || 'Full-time',
      }));
  } catch (error) {
    console.error(`Ashby fetch error for ${company}:`, error);
    return [];
  }
}
