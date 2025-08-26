import axios from 'axios';
import { ApiResponse, Feed, Article, ArticlesResponse, Job, ChatRequest, ChatResponse, WebSearchResult } from '../types';

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
    await api.delete<ApiResponse<Feed>>(`/api/feeds/${id}`);
  },

  fetch: async (id: number): Promise<void> => {
    await api.post<ApiResponse<Feed>>(`/api/feeds/${id}/fetch`);
  },

  fetchAll: async (): Promise<void> => {
    await api.post<ApiResponse<Feed>>('/api/feeds/fetch-all');
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
    await api.delete<ApiResponse<Article>>(`/api/articles/${id}`);
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
    const response = await api.get<ApiResponse<any>>('/api/articles/stats/overview');
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

// Chat API
export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/api/chat/chat', request);
    return response.data;
  },

  sendMessageStream: async (
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onDone: (conversationId: string, searchResults?: WebSearchResult[], decision?: any) => void,
    onError: (error: string) => void,
    onSearchDecision?: (decision: any) => void
  ): Promise<void> => {
    // For streaming, we need to use POST with EventSource-like behavior
    // Since EventSource doesn't support POST, we'll use fetch with streaming
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
              
              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'search_decision' && onSearchDecision) {
                onSearchDecision(data.decision);
              } else if (data.type === 'done') {
                onDone(data.conversationId, data.searchResults, data.searchDecision);
                return;
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (error) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      onError(error instanceof Error ? error.message : 'Connection failed');
    }
  },

  getModels: async (): Promise<string[]> => {
    const response = await api.get<{ models: string[] }>('/api/chat/models');
    return response.data.models;
  },

  checkHealth: async (): Promise<boolean> => {
    const response = await api.get<{ healthy: boolean }>('/api/chat/health');
    return response.data.healthy;
  },
};

// Health check
export const healthApi = {
  check: async () => {
    const response = await api.get<ApiResponse<any>>('/health');
    return response.data;
  },
};

export default api;
