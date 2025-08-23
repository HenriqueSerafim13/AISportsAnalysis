import DatabaseManager from './index';
import { generateLinkTimestampHash } from '../types';

async function migrateRecreateArticlesTable() {
  try {
    console.log('Running migration: Recreating articles table with new schema...');
    
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();
    
    // Check if the new column already exists
    const tableInfo = db.prepare("PRAGMA table_info(articles)").all();
    const hasNewColumn = tableInfo.some((col: any) => col.name === 'link_timestamp_hash');
    const hasUniqueConstraint = tableInfo.some((col: any) => col.name === 'link' && col.pk === 0 && col.notnull === 1);
    
    if (hasNewColumn && !hasUniqueConstraint) {
      console.log('Migration already completed, skipping...');
      return;
    }
    
    // Clean up any leftover tables from previous failed migrations
    console.log('Cleaning up any leftover tables from previous migrations...');
    try {
      db.prepare("DROP TABLE IF EXISTS articles_new").run();
      console.log('Cleaned up articles_new table');
    } catch (e) {
      console.log('No cleanup needed');
    }
    
    // Backup existing data
    console.log('Backing up existing articles data...');
    const existingArticles = db.prepare("SELECT * FROM articles").all();
    console.log(`Found ${existingArticles.length} articles to backup`);
    
    // Create new table with updated schema
    console.log('Creating new articles table...');
    db.prepare(`
      CREATE TABLE articles_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        link_timestamp_hash TEXT UNIQUE NOT NULL,
        content TEXT,
        summary TEXT,
        author TEXT,
        published_at DATETIME,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw_json TEXT,
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
      )
    `).run();
    
    // Create indexes on new table
    console.log('Creating indexes on new table...');
    
    // Drop existing indexes if they exist (they should be dropped with the table, but let's be safe)
    try {
      db.prepare("DROP INDEX IF EXISTS idx_articles_feed_id").run();
      db.prepare("DROP INDEX IF EXISTS idx_articles_published_at").run();
      db.prepare("DROP INDEX IF EXISTS idx_articles_link_timestamp_hash").run();
    } catch (e) {
      console.log('Some indexes may not exist, continuing...');
    }
    
    // Create new indexes
    db.prepare("CREATE INDEX idx_articles_feed_id ON articles_new(feed_id)").run();
    db.prepare("CREATE INDEX idx_articles_published_at ON articles_new(published_at)").run();
    db.prepare("CREATE UNIQUE INDEX idx_articles_link_timestamp_hash ON articles_new(link_timestamp_hash)").run();
    
    // Populate new table with existing data
    if (existingArticles.length > 0) {
      console.log('Populating new table with existing data...');
      
      const insertStmt = db.prepare(`
        INSERT INTO articles_new (
          feed_id, title, link, link_timestamp_hash, content, summary, 
          author, published_at, fetched_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const article of existingArticles) {
        const timestamp = article.published_at || article.fetched_at || new Date().toISOString();
        const hash = generateLinkTimestampHash(article.link, timestamp);
        
        insertStmt.run(
          article.feed_id,
          article.title,
          article.link,
          hash,
          article.content,
          article.summary,
          article.author,
          article.published_at,
          article.fetched_at,
          article.raw_json
        );
      }
      
      console.log(`Migrated ${existingArticles.length} articles to new table`);
    }
    
    // Drop old table and rename new one
    console.log('Replacing old table with new one...');
    db.prepare("DROP TABLE articles").run();
    db.prepare("ALTER TABLE articles_new RENAME TO articles").run();
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateRecreateArticlesTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateRecreateArticlesTable;
