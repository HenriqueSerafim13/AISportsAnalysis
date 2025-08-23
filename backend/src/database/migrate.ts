import DatabaseManager from './index';
import migrateRecreateArticlesTable from './migrate-recreate-articles-table';

async function migrate() {
  try {
    console.log('Running database migrations...');
    
    // The database is automatically initialized when DatabaseManager is instantiated
    const dbManager = DatabaseManager.getInstance();
    
    // Run the articles table migration
    await migrateRecreateArticlesTable();
    
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
