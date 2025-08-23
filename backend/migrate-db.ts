import { migrateToCompositeKey } from './src/database/migrate';

async function main() {
  try {
    console.log('Starting database migration...');
    await migrateToCompositeKey();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
