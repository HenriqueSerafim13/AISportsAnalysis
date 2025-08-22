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
    console.log(`Starting analysis for article ${articleId}`);
    const jobId = await JobManager.createJob('article_analysis', { articleId });
    console.log(`Created job ${jobId} for article analysis`);
    
    // Run analysis in background
    this.runArticleAnalysis(jobId, articleId);
    
    return jobId;
  }

  private async runArticleAnalysis(jobId: string, articleId: number): Promise<void> {
    try {
      console.log(`Running article analysis for job ${jobId}, article ${articleId}`);
      await JobManager.updateJob(jobId, { status: 'running', progress: 10 });
      
      const article = await ArticleRepository.findById(articleId);
      if (!article) {
        throw new Error('Article not found');
      }
      console.log(`Found article: ${article.title}`);

      await JobManager.updateProgress(jobId, 30);

      const sportsPrompt = this.buildSportsAnalysisPrompt(article);
      
      await JobManager.updateProgress(jobId, 50);

      console.log(`Calling Ollama with model: ${this.sportsModel}`);
      
      // Check if Ollama is available and model exists
      try {
        const isHealthy = await ollamaService.checkHealth();
        if (!isHealthy) {
          throw new Error('Ollama service is not available');
        }
        
        const availableModels = await ollamaService.listModels();
        console.log('Available Ollama models:', availableModels);
        
        if (!availableModels.includes(this.sportsModel)) {
          console.warn(`Model ${this.sportsModel} not found, available models:`, availableModels);
          // Try to use the first available model
          if (availableModels.length > 0) {
            this.sportsModel = availableModels[0];
            console.log(`Falling back to model: ${this.sportsModel}`);
          } else {
            throw new Error('No Ollama models available');
          }
        }
      } catch (error) {
        console.error('Ollama health check failed:', error);
        throw new Error(`Ollama service unavailable: ${error}`);
      }
      
      const response = await ollamaService.generateResponse({
        model: this.sportsModel,
        system: this.getSportsSpecialistPrompt(),
        prompt: sportsPrompt,
        options: {
          temperature: 0.3,
          max_tokens: 2000
        }
      });

      console.log(`Ollama response received:`, response);
      console.log(`Response type:`, typeof response);
      console.log(`Response length:`, response ? response.length : 'null/undefined');

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
      // Handle null/undefined response
      if (!response || response === 'undefined' || response.trim() === '') {
        throw new Error('Empty or undefined response from Ollama');
      }

      console.log('Attempting to parse response:', response.substring(0, 200) + '...');
      
      // Try to extract JSON from response if it's wrapped in text
      let jsonContent = response.trim();
      
      // Look for JSON content between ```json and ``` or just { }
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                       response.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonContent);
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
      console.error('Raw response:', response);
      
      // Generate a fallback analysis based on the response text
      return this.generateFallbackAnalysis(response);
    }
  }

  private generateFallbackAnalysis(response: string | undefined): SportsAnalysisResult {
    // Handle undefined/null response
    if (!response) {
      return {
        tags: ['sports', 'analysis_failed'],
        entities: {
          teams: [],
          players: [],
          injuries: [],
          odds_related: []
        },
        summary: 'Analysis completed but no response received from AI model',
        score: 0.0,
        metadata: {
          confidence: 0.0,
          key_insights: ['Analysis failed - no AI response'],
          betting_signals: [],
          error: 'No response from Ollama'
        } as any
      };
    }

    // Extract basic information from the response text
    const tags = this.extractTagsFromText(response);
    const entities = this.extractEntitiesFromText(response);
    
    return {
      tags: tags,
      entities: entities,
      summary: response.substring(0, 500) + '...',
      score: 0.5,
      metadata: {
        confidence: 0.3,
        key_insights: ['Analysis completed with text fallback'],
        betting_signals: [],
        fallback: true
      } as any
    };
  }

  private extractTagsFromText(text: string | undefined): string[] {
    if (!text) return ['sports', 'analysis_failed'];
    
    const tags = [];
    const sportKeywords = ['football', 'soccer', 'basketball', 'tennis', 'baseball', 'hockey', 'golf', 'racing'];
    const lowerText = text.toLowerCase();
    
    for (const keyword of sportKeywords) {
      if (lowerText.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    return tags.length > 0 ? tags.slice(0, 5) : ['sports', 'general']; // Limit to 5 tags
  }

  private extractEntitiesFromText(text: string | undefined): any {
    if (!text) {
      return {
        teams: [],
        players: [],
        injuries: [],
        odds_related: []
      };
    }
    
    // Simple entity extraction - look for capitalized words that might be teams/players
    const words = text.split(/\s+/);
    const entities = {
      teams: [],
      players: [],
      injuries: [],
      odds_related: []
    };
    
    for (const word of words) {
      if (word.length > 2 && /^[A-Z][a-z]+/.test(word)) {
        if ((entities.teams as string[]).length < 3) {
          (entities.teams as string[]).push(word);
        }
      }
    }
    
    return entities;
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
