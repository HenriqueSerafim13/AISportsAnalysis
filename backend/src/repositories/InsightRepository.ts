import Database from 'better-sqlite3';
import DatabaseManager from '../database';
import { Insight } from '../types';

export class InsightRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
  }

  async create(insight: Insight): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO insights (article_id, agent, tags, entities, summary, score, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      insight.article_id,
      insight.agent,
      insight.tags,
      insight.entities,
      insight.summary,
      insight.score,
      insight.metadata
    );
    
    return result.lastInsertRowid as number;
  }

  async findByArticleId(articleId: number): Promise<Insight[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM insights WHERE article_id = ? ORDER BY created_at DESC
    `);
    
    return stmt.all(articleId) as Insight[];
  }

  async findById(id: number): Promise<Insight | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM insights WHERE id = ?
    `);
    
    const result = stmt.get(id) as Insight | undefined;
    return result || null;
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM insights WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getRecentInsights(limit: number = 20): Promise<Insight[]> {
    const stmt = this.db.prepare(`
      SELECT i.*, a.title as article_title 
      FROM insights i 
      JOIN articles a ON i.article_id = a.id 
      ORDER BY i.created_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit) as Insight[];
  }
}

export default new InsightRepository();
