# Database Migration: Adding link_timestamp_hash Column

This migration adds a new `link_timestamp_hash` column to the `articles` table and removes the unique constraint from the `link` column.

## What Changed

1. **Removed unique constraint** from the `link` column in the `articles` table
2. **Added new column** `link_timestamp_hash` that is `TEXT UNIQUE NOT NULL`
3. **Updated TypeScript interfaces** to include the new field
4. **Updated repository methods** to handle the new field
5. **Updated RSS service** to generate the hash when creating articles

## Why This Change

- **Multiple articles with same link**: Allows storing updated articles or different versions of articles with the same URL
- **Better deduplication**: Uses a combination of link and timestamp for uniqueness
- **Flexibility**: Supports scenarios where the same URL might have different content over time

## Migration Files

- `migrate-recreate-articles-table.ts` - Main migration script that recreates the table
- `migrate.ts` - Updated main migration runner
- `schema.sql` - Updated schema definition

## How to Run

### Option 1: Run the main migration
```bash
cd backend
npm run migrate
```

### Option 2: Run the specific migration directly
```bash
cd backend
npx ts-node src/database/migrate-recreate-articles-table.ts
```

## What the Migration Does

1. **Backs up existing data** from the current articles table
2. **Creates a new table** with the updated schema
3. **Populates the new column** with generated hashes for existing articles
4. **Replaces the old table** with the new one
5. **Recreates all indexes** for optimal performance

## Hash Generation

The `link_timestamp_hash` is generated using the `generateLinkTimestampHash()` function:
- Combines the article link with its published timestamp
- Creates a unique hash that prevents duplicate articles with the same link and timestamp
- Uses a simple hash function (consider using crypto.createHash in production)

## Rollback

If you need to rollback this migration:
1. The old schema is available in git history
2. You would need to recreate the table again with the old schema
3. Consider backing up your database before running the migration

## Testing

After migration:
1. Verify the new column exists: `PRAGMA table_info(articles)`
2. Check that existing articles have the new field populated
3. Test creating new articles to ensure the hash is generated correctly
4. Verify that the unique constraint on `link` is removed
5. Verify that the unique constraint on `link_timestamp_hash` is working

## Notes

- This migration recreates the entire articles table, so it may take time for large datasets
- Make sure to backup your database before running this migration
- The migration is idempotent and can be run multiple times safely
