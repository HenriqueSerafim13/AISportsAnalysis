import Database from 'better-sqlite3';
import DatabaseManager from '../database';
import { Feed } from '../types';

export class FeedRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
  }

  async create(feed: Feed): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO feeds (url, title, description, enabled)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(feed.url, feed.title, feed.description, feed.enabled ? 1 : 0);
    return result.lastInsertRowid as number;
  }

  async findAll(): Promise<Feed[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM feeds ORDER BY created_at DESC
    `);
    
    return stmt.all() as Feed[];
  }

  async findById(id: number): Promise<Feed | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM feeds WHERE id = ?
    `);
    
    const result = stmt.get(id) as Feed | undefined;
    return result || null;
  }

  async findByUrl(url: string): Promise<Feed | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM feeds WHERE url = ?
    `);
    
    const result = stmt.get(url) as Feed | undefined;
    return result || null;
  }

  async update(id: number, feed: Partial<Feed>): Promise<boolean> {
    const fields = Object.keys(feed).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = this.db.prepare(`
      UPDATE feeds SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    const values = fields.map(field => {
      const value = (feed as any)[field];
      // Convert boolean to integer for SQLite
      if (field === 'enabled' && typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      return value;
    });
    
    const result = stmt.run(...values, id);
    
    return result.changes > 0;
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM feeds WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async updateLastFetched(id: number): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE feeds SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    stmt.run(id);
  }

  async findEnabled(): Promise<Feed[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM feeds WHERE enabled = 1 ORDER BY last_fetched ASC NULLS FIRST
    `);
    
    return stmt.all() as Feed[];
  }
}

export default new FeedRepository();
