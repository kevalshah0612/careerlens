import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const TENANT_ID = 'b1e343fb-5e88-403c-afca-d12c78cb7914';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TENANT_ID,
  },
});

// Types
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  postedAt: string;
  url: string;
  requiredSkills: string[];
  experienceLevel: string | null;
  remote: boolean;
  visaSponsorship: boolean | null;
  source: string;
  description?: string;
  similarity?: number;
}

export interface JobsResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchResponse {
  query: string;
  jobs: Job[];
  count: number;
}

export interface Stats {
  total: number;
  last24h: number;
  remote: number;
  h1bSponsors: number;
  topCompanies: Array<{ company: string; count: number }>;
}

// API functions
export const jobsApi = {
  getJobs: async (params?: {
    page?: number;
    limit?: number;
    location?: string;
    experienceLevel?: string;
    remote?: boolean;
    company?: string;
    source?: string;
    skills?: string;
  }): Promise<JobsResponse> => {
    const response = await apiClient.get('/api/v1/jobs', { params });
    return response.data;
  },

  search: async (query: string, filters?: {
    location?: string;
    experienceLevel?: string;
    remote?: boolean;
    company?: string;
  }): Promise<SearchResponse> => {
    const response = await apiClient.post('/api/v1/jobs/search', {
      query,
      limit: 20,
      filters,
    });
    return response.data;
  },

  getJob: async (id: string): Promise<Job> => {
    const response = await apiClient.get(`/api/v1/jobs/${id}`);
    return response.data;
  },

  getStats: async (): Promise<Stats> => {
    const response = await apiClient.get('/api/v1/stats');
    return response.data;
  },
};