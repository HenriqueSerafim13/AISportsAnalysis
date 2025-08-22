import DatabaseManager from './index';

async function migrate() {
  try {
    console.log('Running database migrations...');
    
    // The database is automatically initialized when DatabaseManager is instantiated
    const dbManager = DatabaseManager.getInstance();
    
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
