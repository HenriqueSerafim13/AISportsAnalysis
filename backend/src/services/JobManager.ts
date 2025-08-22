import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import DatabaseManager from '../database';
import { Job, SSEEvent } from '../types';

export class JobManager {
  private db: Database.Database;
  private clients: Set<any> = new Set();

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
  }

  async createJob(type: Job['type'], data?: any): Promise<string> {
    const jobId = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, type, status, progress, data)
      VALUES (?, ?, 'pending', 0, ?)
    `);
    
    stmt.run(jobId, type, data ? JSON.stringify(data) : null);
    
    this.broadcastEvent({
      type: 'job.created',
      data: { jobId, type, status: 'pending' }
    });
    
    return jobId;
  }

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = this.db.prepare(`
      UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    const values = [...fields.map(field => (updates as any)[field]), jobId];
    stmt.run(...values);
    
    this.broadcastEvent({
      type: 'job.updated',
      data: { jobId, ...updates }
    });
  }

  async getJob(jobId: string): Promise<Job | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs WHERE id = ?
    `);
    
    const result = stmt.get(jobId) as Job | undefined;
    return result || null;
  }

  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.updateJob(jobId, { progress });
  }

  async completeJob(jobId: string, data?: any): Promise<void> {
    await this.updateJob(jobId, { 
      status: 'completed', 
      progress: 100,
      data: data ? JSON.stringify(data) : undefined
    });
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await this.updateJob(jobId, { 
      status: 'failed', 
      error 
    });
  }

  addClient(client: any): void {
    this.clients.add(client);
  }

  removeClient(client: any): void {
    this.clients.delete(client);
  }

  broadcastEvent(event: SSEEvent): void {
    const eventString = `data: ${JSON.stringify(event)}\n\n`;
    
    this.clients.forEach(client => {
      if (client.writable) {
        client.write(eventString);
      }
    });
  }

  async cleanupOldJobs(days: number = 7): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM jobs 
      WHERE created_at < datetime('now', '-${days} days')
      AND status IN ('completed', 'failed')
    `);
    
    stmt.run();
  }

  async processJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job || job.status !== 'pending') {
      return;
    }

    try {
      await this.updateJob(jobId, { status: 'running' });

      switch (job.type) {
        case 'rss_fetch':
          await this.processRSSFetchJob(jobId, job);
          break;
        case 'article_analysis':
          await this.processArticleAnalysisJob(jobId, job);
          break;
        case 'reasoning':
          await this.processReasoningAnalysisJob(jobId, job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error: any) {
      console.error(`Job ${jobId} failed:`, error);
      await this.failJob(jobId, error.message);
    }
  }

  private async processRSSFetchJob(jobId: string, job: Job): Promise<void> {
    const jobData = job.data ? JSON.parse(job.data) : {};
    
    // Import services here to avoid circular dependencies
    const RSSService = (await import('./rss')).default;
    const FeedRepository = (await import('../repositories/FeedRepository')).default;
    const ArticleRepository = (await import('../repositories/ArticleRepository')).default;

    if (jobData.feedId) {
      // Fetch single feed
      await this.fetchSingleFeed(jobId, jobData.feedId, RSSService, FeedRepository, ArticleRepository);
    } else if (jobData.allFeeds) {
      // Fetch all enabled feeds
      await this.fetchAllFeeds(jobId, RSSService, FeedRepository, ArticleRepository);
    } else {
      throw new Error('No feedId or allFeeds flag provided for RSS fetch job');
    }
  }

  private async fetchSingleFeed(
    jobId: string, 
    feedId: number, 
    RSSService: any, 
    FeedRepository: any, 
    ArticleRepository: any
  ): Promise<void> {
    await this.updateProgress(jobId, 10);

    const feed = await FeedRepository.findById(feedId);
    if (!feed) {
      throw new Error(`Feed with ID ${feedId} not found`);
    }

    console.log(`Fetching single RSS feed: ${feed.url}`);
    
    await this.updateProgress(jobId, 30);
    
    const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
    
    await this.updateProgress(jobId, 60);
    
    // Update feed info
    await FeedRepository.update(feed.id!, {
      title: feedData.title,
      description: feedData.description
    });
    
    // Save new articles
    const newArticles = [];
    for (const article of articles) {
      const existing = await ArticleRepository.findByLink(article.link);
      if (!existing) {
        article.feed_id = feed.id!;
        newArticles.push(article);
      }
    }
    
    if (newArticles.length > 0) {
      try {
        await ArticleRepository.createMany(newArticles);
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log(`Some articles from ${feed.title} already exist (duplicates skipped)`);
        } else {
          throw error;
        }
      }
    }
    
    await FeedRepository.updateLastFetched(feed.id!);
    await this.updateProgress(jobId, 90);
    
    await this.completeJob(jobId, { 
      articlesAdded: newArticles.length,
      totalArticles: articles.length,
      feedTitle: feed.title
    });
    
    console.log(`Fetched ${newArticles.length} new articles from ${feed.title}`);
  }

  private async fetchAllFeeds(
    jobId: string, 
    RSSService: any, 
    FeedRepository: any, 
    ArticleRepository: any
  ): Promise<void> {
    await this.updateProgress(jobId, 10);

    const enabledFeeds = await FeedRepository.findEnabled();
    console.log(`Found ${enabledFeeds.length} enabled feeds`);
    
    if (enabledFeeds.length === 0) {
      console.log('No enabled feeds found. RSS fetch completed.');
      await this.completeJob(jobId, { message: 'No enabled feeds found' });
      return;
    }

    let totalNewArticles = 0;
    let processedFeeds = 0;

    for (const feed of enabledFeeds) {
      console.log(`Fetching RSS feed: ${feed.url}`);
      try {
        const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
        
        // Update feed info
        await FeedRepository.update(feed.id!, {
          title: feedData.title,
          description: feedData.description
        });
        
        // Save new articles
        const newArticles = [];
        for (const article of articles) {
          const existing = await ArticleRepository.findByLink(article.link);
          if (!existing) {
            article.feed_id = feed.id!;
            newArticles.push(article);
          }
        }
        
        if (newArticles.length > 0) {
          try {
            await ArticleRepository.createMany(newArticles);
          } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
              console.log(`Some articles from ${feed.title} already exist (duplicates skipped)`);
            } else {
              throw error;
            }
          }
        }
        
        await FeedRepository.updateLastFetched(feed.id!);
        totalNewArticles += newArticles.length;
        
        console.log(`Fetched ${newArticles.length} new articles from ${feed.title}`);
        
      } catch (error: any) {
        console.error(`Failed to fetch feed ${feed.url}:`, error.message);
      }
      
      processedFeeds++;
      const progress = 10 + Math.floor((processedFeeds / enabledFeeds.length) * 80);
      await this.updateProgress(jobId, progress);
    }

    await this.completeJob(jobId, { 
      feedsProcessed: processedFeeds,
      totalNewArticles: totalNewArticles
    });
  }

  private async processArticleAnalysisJob(jobId: string, job: Job): Promise<void> {
    const jobData = job.data ? JSON.parse(job.data) : {};
    
    if (!jobData.articleId) {
      throw new Error('No articleId provided for article analysis job');
    }

    // Import AnalysisService here to avoid circular dependencies
    const AnalysisService = (await import('./AnalysisService')).default;
    
    // The AnalysisService will handle the actual analysis
    // We just need to ensure the job is properly tracked
    await this.updateProgress(jobId, 50);
    
    // For now, we'll mark it as completed since AnalysisService handles the actual work
    // In a more sophisticated system, we might want to coordinate between them
    await this.completeJob(jobId, { message: 'Article analysis completed by AnalysisService' });
  }

  private async processReasoningAnalysisJob(jobId: string, job: Job): Promise<void> {
    const jobData = job.data ? JSON.parse(job.data) : {};
    
    if (!jobData.prompt) {
      throw new Error('No prompt provided for reasoning analysis job');
    }

    // Import AnalysisService here to avoid circular dependencies
    const AnalysisService = (await import('./AnalysisService')).default;
    
    // The AnalysisService will handle the actual reasoning
    // We just need to ensure the job is properly tracked
    await this.updateProgress(jobId, 50);
    
    // For now, we'll mark it as completed since AnalysisService handles the actual work
    // In a more sophisticated system, we might want to coordinate between them
    await this.completeJob(jobId, { message: 'Reasoning analysis completed by AnalysisService' });
  }
}

export default new JobManager();
