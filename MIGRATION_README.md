# Database Schema Migration: Composite Primary Key

## Overview

This migration changes the articles table from using an auto-incrementing integer ID to a composite primary key based on the article's `link` and `published_at` timestamp. This ensures that articles are uniquely identified by their URL and publication time, which is more natural for RSS feeds.

## Changes Made

### Database Schema Changes

1. **Articles Table**:
   - Removed `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - Added `PRIMARY KEY (link, published_at)`
   - Made `published_at` NOT NULL (was optional before)

2. **Insights Table**:
   - Changed `article_id INTEGER` to `article_link TEXT` and `article_published_at DATETIME`
   - Updated foreign key to reference the composite primary key

3. **Indexes**:
   - Updated indexes to work with the new structure
   - Added indexes for `link` and the composite key components

### Code Changes

1. **Types**:
   - Updated `Article` interface to remove `id` and make `published_at` required
   - Updated `Insight` interface to use `article_link` and `article_published_at`

2. **Repositories**:
   - Updated `ArticleRepository` to work with composite keys
   - Updated `InsightRepository` to reference articles by link and timestamp
   - Changed methods from ID-based to composite key-based

3. **Services**:
   - Updated `AnalysisService` to work with composite keys
   - Changed article analysis methods to accept link and timestamp

4. **Routes**:
   - Updated article routes from `/:id` to `/:link/:published_at`
   - Updated analysis routes to work with composite keys
   - Added URL encoding/decoding for link parameters

5. **Frontend**:
   - Updated API service to work with new route structure
   - Changed methods to use link and timestamp instead of ID

## Migration Process

### 1. Backup Your Database

Before running the migration, make sure to backup your existing database:

```bash
cp backend/data/sports.db backend/data/sports.db.backup
```

### 2. Run the Migration

Navigate to the backend directory and run the migration:

```bash
cd backend
npm run build
node migrate-db.js
```

Or if you have TypeScript support:

```bash
cd backend
npx ts-node migrate-db.ts
```

### 3. Verify Migration

The migration will:
- Create new tables with the updated schema
- Copy all existing data to the new structure
- Drop the old tables
- Create new indexes
- Preserve all your existing articles and insights

### 4. Test the Application

After migration, test that:
- Articles can be fetched and displayed
- Analysis can be run on articles
- Insights are properly linked to articles
- All CRUD operations work correctly

## API Changes

### Article Routes

| Old Route | New Route | Description |
|-----------|-----------|-------------|
| `GET /api/articles/:id` | `GET /api/articles/:link/:published_at` | Get article by link and timestamp |
| `GET /api/articles/:id/insights` | `GET /api/articles/:link/:published_at/insights` | Get article with insights |
| `DELETE /api/articles/:id` | `DELETE /api/articles/:link/:published_at` | Delete article |

### Analysis Routes

| Old Route | New Route | Description |
|-----------|-----------|-------------|
| `POST /api/analysis/article/:id` | `POST /api/analysis/article/:link/:published_at` | Analyze article |

### Bulk Operations

The bulk delete operation now expects:

```json
{
  "articles": [
    {
      "link": "https://example.com/article1",
      "published_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

Instead of the old format:

```json
{
  "ids": [1, 2, 3]
}
```

## Benefits

1. **Natural Identification**: Articles are now identified by their actual URL and publication time
2. **Duplicate Prevention**: The composite key prevents duplicate articles with the same URL and timestamp
3. **Better RSS Integration**: More natural for RSS feeds where articles are identified by link
4. **Improved Data Integrity**: Ensures articles can't be duplicated across feeds

## Rollback

If you need to rollback, you can restore from your backup:

```bash
cp backend/data/sports.db.backup backend/data/sports.db
```

## Notes

- The migration preserves all existing data
- URL encoding is used for link parameters in routes
- The `published_at` field is now required for all articles
- All existing functionality is preserved with the new structure
