import DatabaseManager from '../database';
import FeedRepository from '../repositories/FeedRepository';
import ArticleRepository from '../repositories/ArticleRepository';

async function debugFeed(feedId: number) {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  
  try {
    console.log(`\n🔍 Debugging Feed ID: ${feedId}`);
    
    // Get feed info
    const feed = await FeedRepository.findById(feedId);
    if (!feed) {
      console.log(`❌ Feed with ID ${feedId} not found`);
      return;
    }
    
    console.log(`\n📰 Feed: ${feed.title}`);
    console.log(`URL: ${feed.url}`);
    console.log(`Last fetched: ${feed.last_fetched || 'Never'}`);
    
    // Get article count
    const articleCount = await ArticleRepository.getCountByFeedId(feedId);
    console.log(`\n📊 Total articles in database: ${articleCount}`);
    
    // Get recent articles
    const recentArticles = await ArticleRepository.findByFeedId(feedId, 10, 0);
    console.log(`\n📄 Recent articles (last 10):`);
    
    if (recentArticles.length > 0) {
      recentArticles.forEach((article, index) => {
        console.log(`  ${index + 1}. "${article.title}"`);
        console.log(`     Link: ${article.link}`);
        console.log(`     Published: ${article.published_at}`);
        console.log(`     ID: ${article.id}`);
        console.log('');
      });
    } else {
      console.log(`  No articles found for this feed`);
    }
    
    // Check for potential duplicate links
    console.log(`\n🔍 Checking for duplicate links...`);
    const duplicateLinksStmt = db.prepare(`
      SELECT link, COUNT(*) as count 
      FROM articles 
      WHERE feed_id = ? 
      GROUP BY link 
      HAVING COUNT(*) > 1
    `);
    
    const duplicateLinks = duplicateLinksStmt.all(feedId) as Array<{link: string, count: number}>;
    if (duplicateLinks.length > 0) {
      console.log(`⚠️  Found ${duplicateLinks.length} duplicate links:`);
      duplicateLinks.forEach(dup => {
        console.log(`  Link: ${dup.link} (${dup.count} times)`);
      });
    } else {
      console.log(`✅ No duplicate links found`);
    }
    
    // Check database constraints
    console.log(`\n🔍 Checking database schema...`);
    const tableInfoStmt = db.prepare("PRAGMA table_info(articles)");
    const tableInfo = tableInfoStmt.all() as Array<{name: string, type: string, notnull: number, pk: number}>;
    
    console.log(`Articles table structure:`);
    tableInfo.forEach(column => {
      console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check for any unique constraints
    const indexStmt = db.prepare("PRAGMA index_list(articles)");
    const indexes = indexStmt.all() as Array<{name: string, unique: number}>;
    
    console.log(`\nIndexes on articles table:`);
    indexes.forEach(index => {
      console.log(`  ${index.name}: ${index.unique ? 'UNIQUE' : 'NON-UNIQUE'}`);
    });
    
  } catch (error) {
    console.error('Error debugging feed:', error);
  } finally {
    dbManager.close();
  }
}

// Get feed ID from command line argument
const feedId = parseInt(process.argv[2]);
if (isNaN(feedId)) {
  console.log('Usage: npm run debug-feed <feed_id>');
  console.log('Example: npm run debug-feed 1');
  process.exit(1);
}

debugFeed(feedId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
