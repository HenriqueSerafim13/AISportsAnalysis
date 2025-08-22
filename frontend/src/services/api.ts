import axios from 'axios';
import { ApiResponse, Feed, Article, ArticlesResponse, Job } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Feeds API
export const feedsApi = {
  getAll: async (): Promise<Feed[]> => {
    const response = await api.get<ApiResponse<Feed[]>>('/api/feeds');
    return response.data.data || [];
  },

  create: async (feed: Omit<Feed, 'id'>): Promise<Feed> => {
    const response = await api.post<ApiResponse<Feed>>('/api/feeds', feed);
    return response.data.data!;
  },

  update: async (id: number, feed: Partial<Feed>): Promise<Feed> => {
    const response = await api.put<ApiResponse<Feed>>(`/api/feeds/${id}`, feed);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete<ApiResponse>(`/api/feeds/${id}`);
  },

  fetch: async (id: number): Promise<void> => {
    await api.post<ApiResponse>(`/api/feeds/${id}/fetch`);
  },

  fetchAll: async (): Promise<void> => {
    await api.post<ApiResponse>('/api/feeds/fetch-all');
  },
};

// Articles API
export const articlesApi = {
  getAll: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    feedId?: number;
  }): Promise<ArticlesResponse> => {
    const response = await api.get<ApiResponse<ArticlesResponse>>('/api/articles', {
      params,
    });
    return response.data.data!;
  },

  getRecent: async (days: number = 7): Promise<Article[]> => {
    const response = await api.get<ApiResponse<Article[]>>('/api/articles/recent', {
      params: { days },
    });
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Article> => {
    const response = await api.get<ApiResponse<Article>>(`/api/articles/${id}`);
    return response.data.data!;
  },

  getWithInsights: async (id: number): Promise<Article & { insights?: any[] }> => {
    const response = await api.get<ApiResponse<Article & { insights?: any[] }>>(`/api/articles/${id}/insights`);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete<ApiResponse>(`/api/articles/${id}`);
  },

  bulkDelete: async (params: {
    ids?: number[];
    feedId?: number;
    olderThan?: number;
    search?: string;
  }): Promise<{ deletedCount: number }> => {
    const response = await api.delete<ApiResponse<{ deletedCount: number }>>('/api/articles/bulk', {
      data: params,
    });
    return response.data.data!;
  },

  getStats: async () => {
    const response = await api.get<ApiResponse>('/api/articles/stats/overview');
    return response.data.data;
  },
};

// Analysis API
export const analysisApi = {
  analyzeArticle: async (articleId: number): Promise<string> => {
    const response = await api.post<ApiResponse<{ jobId: string }>>(
      `/api/analysis/article/${articleId}`
    );
    return response.data.data!.jobId;
  },

  runReasoning: async (prompt: string, contextArticleIds?: number[]): Promise<string> => {
    const response = await api.post<ApiResponse<{ jobId: string }>>('/api/analysis/reasoning', {
      prompt,
      contextArticleIds,
    });
    return response.data.data!.jobId;
  },
};

// Jobs API
export const jobsApi = {
  getById: async (id: string): Promise<Job> => {
    const response = await api.get<ApiResponse<Job>>(`/api/jobs/${id}`);
    return response.data.data!;
  },
};

// Health check
export const healthApi = {
  check: async () => {
    const response = await api.get<ApiResponse>('/health');
    return response.data;
  },
};

export default api;
