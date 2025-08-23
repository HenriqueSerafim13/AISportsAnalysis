export interface Feed {
  id?: number;
  url: string;
  title: string;
  description?: string;
  last_fetched?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Article {
  id?: number;
  feed_id: number;
  title: string;
  link: string;
  link_timestamp_hash: string;
  content?: string;
  summary?: string;
  author?: string;
  published_at?: string;
  fetched_at?: string;
  raw_json?: string;
  feed_title?: string;
}

export interface Insight {
  id?: number;
  article_id: number;
  agent: string;
  tags?: string;
  entities?: string;
  summary?: string;
  score?: number;
  metadata?: string;
  created_at?: string;
}

export interface Job {
  id: string;
  type: 'rss_fetch' | 'article_analysis' | 'reasoning';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  data?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ArticlesResponse {
  articles: Article[];
  pagination: PaginationInfo;
}

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
}

export interface SportsAnalysisResult {
  tags: string[];
  entities: {
    teams: string[];
    players: string[];
    injuries: string[];
    odds_related: string[];
  };
  summary: string;
  score: number;
  metadata: {
    confidence: number;
    key_insights: string[];
    betting_signals: string[];
  };
}

export interface ReasoningAnalysisResult {
  reasoning: string;
  estimated_odds?: {
    team_a: string;
    team_b: string;
    odds_a: number;
    odds_b: number;
    confidence: number;
  };
  factors: string[];
  recommendation?: string;
}
