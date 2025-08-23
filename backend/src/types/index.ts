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
}

export interface Insight {
  id?: number;
  article_id: number;
  agent: string;
  tags?: string; // JSON string
  entities?: string; // JSON string
  summary?: string;
  score?: number;
  metadata?: string; // JSON string
  created_at?: string;
}

export interface Analysis {
  id?: number;
  prompt: string;
  context_snapshot?: string; // JSON string
  result_text?: string;
  metadata?: string; // JSON string
  created_at?: string;
}

export interface Job {
  id: string;
  type: 'rss_fetch' | 'article_analysis' | 'reasoning';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  data?: string; // JSON string
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
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

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Utility function to generate a unique hash for link + timestamp
export function generateLinkTimestampHash(link: string, timestamp: string): string {
  const combined = `${link}|${timestamp}`;
  // Simple hash function - in production you might want to use crypto.createHash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
