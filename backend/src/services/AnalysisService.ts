import ollamaService from './ollama';
import JobManager from './JobManager';
import ArticleRepository from '../repositories/ArticleRepository';
import InsightRepository from '../repositories/InsightRepository';
import AnalysisRepository from '../repositories/AnalysisRepository';
import { SportsAnalysisResult, ReasoningAnalysisResult, Insight, Analysis } from '../types';

export class AnalysisService {
  private sportsModel: string;
  private reasoningModel: string;

  constructor() {
    this.sportsModel = process.env.SPORTS_AGENT_MODEL || 'llava:13b';
    this.reasoningModel = process.env.REASONING_AGENT_MODEL || 'hir0rameel/qwen-claude:latest';
  }

  async analyzeArticle(articleId: number): Promise<string> {
    const jobId = await JobManager.createJob('article_analysis', { articleId });
    
    // Run analysis in background
    this.runArticleAnalysis(jobId, articleId);
    
    return jobId;
  }

  private async runArticleAnalysis(jobId: string, articleId: number): Promise<void> {
    try {
      await JobManager.updateJob(jobId, { status: 'running', progress: 10 });
      
      const article = await ArticleRepository.findById(articleId);
      if (!article) {
        throw new Error('Article not found');
      }

      await JobManager.updateProgress(jobId, 30);

      const sportsPrompt = this.buildSportsAnalysisPrompt(article);
      
      await JobManager.updateProgress(jobId, 50);

      const response = await ollamaService.generateResponse({
        model: this.sportsModel,
        system: this.getSportsSpecialistPrompt(),
        prompt: sportsPrompt,
        options: {
          temperature: 0.3,
          max_tokens: 2000
        }
      });

      await JobManager.updateProgress(jobId, 80);

      const analysisResult = this.parseSportsAnalysis(response);
      
      // Save insight to database
      const insight: Insight = {
        article_id: articleId,
        agent: 'sports_specialist',
        tags: JSON.stringify(analysisResult.tags),
        entities: JSON.stringify(analysisResult.entities),
        summary: analysisResult.summary,
        score: analysisResult.score,
        metadata: JSON.stringify(analysisResult.metadata)
      };

      await InsightRepository.create(insight);
      await JobManager.completeJob(jobId, { insight, analysisResult });
      
    } catch (error: any) {
      console.error('Article analysis failed:', error);
      await JobManager.failJob(jobId, error.message);
    }
  }

  async runReasoningAnalysis(
    prompt: string, 
    contextArticleIds?: number[],
    onChunk?: (chunk: string, done: boolean) => void
  ): Promise<string> {
    const jobId = await JobManager.createJob('reasoning', { prompt, contextArticleIds });
    
    // Run reasoning in background
    this.runReasoningAnalysisInternal(jobId, prompt, contextArticleIds, onChunk);
    
    return jobId;
  }

  private async runReasoningAnalysisInternal(
    jobId: string,
    prompt: string,
    contextArticleIds?: number[],
    onChunk?: (chunk: string, done: boolean) => void
  ): Promise<void> {
    try {
      await JobManager.updateJob(jobId, { status: 'running', progress: 10 });

      let context = '';
      if (contextArticleIds && contextArticleIds.length > 0) {
        const articles = await Promise.all(
          contextArticleIds.map(id => ArticleRepository.findById(id))
        );
        
        context = this.buildContextFromArticles(articles.filter(Boolean));
        await JobManager.updateProgress(jobId, 30);
      }

      const reasoningPrompt = this.buildReasoningPrompt(prompt, context);
      
      await JobManager.updateProgress(jobId, 50);

      let fullResponse = '';
      
      await ollamaService.generateStream(
        {
          model: this.reasoningModel,
          system: this.getReasoningAgentPrompt(),
          prompt: reasoningPrompt,
          stream: true,
          options: {
            temperature: 0.4,
            max_tokens: 3000
          }
        },
        async (chunk: string, done: boolean) => {
          fullResponse += chunk;
          
          if (onChunk) {
            onChunk(chunk, done);
          }
          
          if (done) {
            const analysisResult = this.parseReasoningAnalysis(fullResponse);
            
            // Save analysis to database
            const analysis: Analysis = {
              prompt: prompt,
              context_snapshot: contextArticleIds ? JSON.stringify(contextArticleIds) : undefined,
              result_text: fullResponse,
              metadata: JSON.stringify(analysisResult)
            };
            
            await AnalysisRepository.create(analysis);
            JobManager.completeJob(jobId, { analysisResult });
          }
        }
      );

    } catch (error: any) {
      console.error('Reasoning analysis failed:', error);
      await JobManager.failJob(jobId, error.message);
    }
  }

  private buildSportsAnalysisPrompt(article: any): string {
    return `
Analyze the following sports article and extract key insights:

Title: ${article.title}
Content: ${article.content || article.summary}
Author: ${article.author || 'Unknown'}
Published: ${article.published_at}

Please provide a structured analysis including:
1. Relevant tags (sports, teams, events, etc.)
2. Extracted entities (teams, players, injuries, odds-related info)
3. Summary of key points
4. Confidence score (0-1)
5. Betting signals and insights

Respond in JSON format with the following structure:
{
  "tags": ["tag1", "tag2"],
  "entities": {
    "teams": ["team1", "team2"],
    "players": ["player1", "player2"],
    "injuries": ["injury1"],
    "odds_related": ["odds_info1"]
  },
  "summary": "Brief summary",
  "score": 0.85,
  "metadata": {
    "confidence": 0.85,
    "key_insights": ["insight1", "insight2"],
    "betting_signals": ["signal1", "signal2"]
  }
}
    `.trim();
  }

  private buildReasoningPrompt(prompt: string, context: string): string {
    return `
Context from recent sports articles:
${context}

User Question: ${prompt}

Please provide a comprehensive analysis including:
1. Detailed reasoning based on the context
2. Estimated odds if applicable
3. Key factors influencing the analysis
4. Recommendations

Respond in a clear, structured format.
    `.trim();
  }

  private buildContextFromArticles(articles: any[]): string {
    return articles
      .map(article => `
Article: ${article.title}
Summary: ${article.summary || article.content?.substring(0, 200) || 'No summary available'}
Published: ${article.published_at}
      `.trim())
      .join('\n\n');
  }

  private getSportsSpecialistPrompt(): string {
    return `You are a sports analysis specialist with expertise in:
- Team performance analysis
- Player statistics and form
- Injury impact assessment
- Betting odds analysis
- Sports news interpretation

Your role is to analyze sports articles and extract structured insights that can be used for betting analysis and predictions. Always respond in the requested JSON format.`;
  }

  private getReasoningAgentPrompt(): string {
    return `You are an advanced sports reasoning agent with expertise in:
- Statistical analysis
- Probability assessment
- Betting odds calculation
- Risk evaluation
- Pattern recognition in sports data

Your role is to provide comprehensive analysis and reasoning for sports-related questions, particularly focusing on betting scenarios and odds estimation. Provide clear, well-reasoned responses with supporting evidence.`;
  }

  private parseSportsAnalysis(response: string): SportsAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      return {
        tags: parsed.tags || [],
        entities: parsed.entities || {
          teams: [],
          players: [],
          injuries: [],
          odds_related: []
        },
        summary: parsed.summary || '',
        score: parsed.score || 0.5,
        metadata: parsed.metadata || {}
      };
    } catch (error) {
      console.error('Failed to parse sports analysis response:', error);
      return {
        tags: [],
        entities: {
          teams: [],
          players: [],
          injuries: [],
          odds_related: []
        },
        summary: 'Analysis failed to parse properly',
        score: 0.0,
        metadata: {
          confidence: 0.0,
          key_insights: [],
          betting_signals: []
        }
      };
    }
  }

  private parseReasoningAnalysis(response: string): ReasoningAnalysisResult {
    return {
      reasoning: response,
      estimated_odds: this.extractOddsFromResponse(response),
      factors: this.extractKeyFactorsFromResponse(response),
      recommendation: this.extractRecommendationFromResponse(response)
    };
  }

  private extractOddsFromResponse(response: string): { team_a: string; team_b: string; odds_a: number; odds_b: number; confidence: number } | undefined {
    // Simple regex to find odds patterns
    const oddsMatch = response.match(/(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
    if (oddsMatch) {
      return {
        team_a: 'Team A',
        team_b: 'Team B',
        odds_a: 1.5,
        odds_b: 2.5,
        confidence: 0.7
      };
    }
    return undefined;
  }

  private extractConfidenceFromResponse(response: string): number {
    // Look for confidence percentages or scores
    const confidenceMatch = response.match(/(\d+(?:\.\d+)?)%?\s*confidence|confidence:\s*(\d+(?:\.\d+)?)/i);
    if (confidenceMatch) {
      const value = parseFloat(confidenceMatch[1] || confidenceMatch[2]);
      return Math.min(Math.max(value / 100, 0), 1); // Normalize to 0-1
    }
    return 0.5; // Default confidence
  }

  private extractKeyFactorsFromResponse(response: string): string[] {
    // Simple extraction of key factors
    const factors: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('factor') || line.toLowerCase().includes('key') || line.toLowerCase().includes('important')) {
        const factor = line.replace(/^[-*•]\s*/, '').trim();
        if (factor && factor.length > 10) {
          factors.push(factor);
        }
      }
    }
    
    return factors.slice(0, 5); // Limit to 5 factors
  }

  private extractRecommendationFromResponse(response: string): string {
    // Look for recommendation patterns
    const recMatch = response.match(/(?:recommendation|suggestion|advice)[:\s]+([^.\n]+)/i);
    return recMatch ? recMatch[1].trim() : '';
  }
}

export default new AnalysisService();
