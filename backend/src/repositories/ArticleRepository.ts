import Database from 'better-sqlite3';
import DatabaseManager from '../database';
import { Article } from '../types';

export class ArticleRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
  }

  async create(article: Article): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO articles (feed_id, title, link, link_timestamp_hash, content, summary, author, published_at, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      article.feed_id,
      article.title,
      article.link,
      article.link_timestamp_hash,
      article.content,
      article.summary,
      article.author,
      article.published_at,
      article.raw_json
    );
    
    return result.lastInsertRowid as number;
  }

  async createMany(articles: Article[]): Promise<number[]> {
    const stmt = this.db.prepare(`
      INSERT INTO articles (feed_id, title, link, link_timestamp_hash, content, summary, author, published_at, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction((articles: Article[]) => {
      const ids: number[] = [];
      for (const article of articles) {
        const result = stmt.run(
          article.feed_id,
          article.title,
          article.link,
          article.link_timestamp_hash,
          article.content,
          article.summary,
          article.author,
          article.published_at,
          article.raw_json
        );
        ids.push(result.lastInsertRowid as number);
      }
      return ids;
    });
    
    return transaction(articles);
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<Article[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, f.title as feed_title 
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      ORDER BY a.published_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset) as Article[];
  }

  async findById(id: number): Promise<Article | null> {
    const stmt = this.db.prepare(`
      SELECT a.*, f.title as feed_title 
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      WHERE a.id = ?
    `);
    
    const result = stmt.get(id) as Article | undefined;
    return result || null;
  }

  async findByFeedId(feedId: number, limit: number = 50, offset: number = 0): Promise<Article[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, f.title as feed_title 
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      WHERE a.feed_id = ? 
      ORDER BY a.published_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(feedId, limit, offset) as Article[];
  }

  async findByLink(link: string): Promise<Article | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM articles WHERE link = ?
    `);
    
    const result = stmt.get(link) as Article | undefined;
    return result || null;
  }

  async findByLinkTimestampHash(hash: string): Promise<Article | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM articles WHERE link_timestamp_hash = ?
    `);
    
    const result = stmt.get(hash) as Article | undefined;
    return result || null;
  }

  async search(query: string, limit: number = 50, offset: number = 0): Promise<Article[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, f.title as feed_title 
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      WHERE a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ?
      ORDER BY a.published_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm, limit, offset) as Article[];
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM articles WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getCount(): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM articles
    `);
    
    const result = stmt.get() as { count: number };
    return result.count;
  }

  async getRecentArticles(days: number = 7): Promise<Article[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, f.title as feed_title 
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      WHERE a.published_at >= datetime('now', '-${days} days')
      ORDER BY a.published_at DESC
    `);
    
    return stmt.all() as Article[];
  }

  async getSearchCount(query: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE title LIKE ? OR content LIKE ? OR summary LIKE ?
    `);
    
    const searchTerm = `%${query}%`;
    const result = stmt.get(searchTerm, searchTerm, searchTerm) as { count: number };
    return result.count;
  }

  async getCountByFeedId(feedId: number): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM articles WHERE feed_id = ?
    `);
    
    const result = stmt.get(feedId) as { count: number };
    return result.count;
  }

  async deleteMany(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      DELETE FROM articles WHERE id IN (${placeholders})
    `);
    
    const result = stmt.run(...ids);
    return result.changes;
  }

  async deleteByFeedId(feedId: number): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM articles WHERE feed_id = ?
    `);
    
    const result = stmt.run(feedId);
    return result.changes;
  }

  async deleteOlderThan(days: number): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM articles WHERE published_at < datetime('now', '-${days} days')
    `);
    
    const result = stmt.run();
    return result.changes;
  }

  async deleteBySearch(query: string): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM articles 
      WHERE title LIKE ? OR content LIKE ? OR summary LIKE ?
    `);
    
    const searchTerm = `%${query}%`;
    const result = stmt.run(searchTerm, searchTerm, searchTerm);
    return result.changes;
  }
}

export default new ArticleRepository();
