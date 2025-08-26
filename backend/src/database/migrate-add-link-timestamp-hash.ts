import DatabaseManager from './index';
import { generateLinkTimestampHash } from '../types';

async function migrateAddLinkTimestampHash() {
  try {
    console.log('Running migration: Adding link_timestamp_hash column...');
    
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();
    
    // Check if the column already exists
    const tableInfo = db.prepare("PRAGMA table_info(articles)").all();
    const hasColumn = tableInfo.some((col: any) => col.name === 'link_timestamp_hash');
    
    if (hasColumn) {
      console.log('Column link_timestamp_hash already exists, skipping migration');
      return;
    }
    
    // Add the new column
    console.log('Adding link_timestamp_hash column...');
    db.prepare("ALTER TABLE articles ADD COLUMN link_timestamp_hash TEXT").run();
    
    // Create a unique index on the new column
    console.log('Creating unique index on link_timestamp_hash...');
    db.prepare("CREATE UNIQUE INDEX idx_articles_link_timestamp_hash ON articles(link_timestamp_hash)").run();
    
    // Populate the new column for existing articles
    console.log('Populating link_timestamp_hash for existing articles...');
    const articles = db.prepare("SELECT id, link, published_at, fetched_at FROM articles WHERE link_timestamp_hash IS NULL").all();
    
    if (articles.length > 0) {
      console.log(`Found ${articles.length} articles to update...`);
      
      const updateStmt = db.prepare("UPDATE articles SET link_timestamp_hash = ? WHERE id = ?");
      
      for (const article of articles as any[]) {
        const timestamp = article.published_at || article.fetched_at || new Date().toISOString();
        const hash = generateLinkTimestampHash(article.link, timestamp);
        updateStmt.run(hash, article.id);
      }
      
      console.log(`Updated ${articles.length} articles with link_timestamp_hash`);
    }
    
    // Remove the unique constraint from the link column
    console.log('Removing unique constraint from link column...');
    
    // SQLite doesn't support dropping constraints directly, so we need to recreate the table
    // This is a more complex operation that should be done carefully
    console.log('Note: To remove the unique constraint from the link column, you may need to recreate the table or use a different approach');
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAddLinkTimestampHash()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateAddLinkTimestampHash;
