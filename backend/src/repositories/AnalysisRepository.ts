import Database from 'better-sqlite3';
import DatabaseManager from '../database';
import { Analysis } from '../types';

export class AnalysisRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
  }

  async create(analysis: Analysis): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO analyses (prompt, context_snapshot, result_text, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      analysis.prompt,
      analysis.context_snapshot,
      analysis.result_text,
      analysis.metadata
    );
    
    return result.lastInsertRowid as number;
  }

  async findById(id: number): Promise<Analysis | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM analyses WHERE id = ?
    `);
    
    const result = stmt.get(id) as Analysis | undefined;
    return result || null;
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<Analysis[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM analyses ORDER BY created_at DESC LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset) as Analysis[];
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM analyses WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getCount(): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM analyses
    `);
    
    const result = stmt.get() as { count: number };
    return result.count;
  }
}

export default new AnalysisRepository();
