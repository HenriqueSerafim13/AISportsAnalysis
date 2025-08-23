import DatabaseManager from '../database';

async function diagnoseEncoding() {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  
  try {
    console.log('🔍 Diagnosing encoding issues...\n');
    
    // Check feeds
    console.log('📰 FEEDS:');
    const feedsStmt = db.prepare('SELECT id, title, description, url FROM feeds ORDER BY id');
    const feeds = feedsStmt.all() as any[];
    
    feeds.forEach(feed => {
      console.log(`\nFeed ${feed.id}: ${feed.url}`);
      console.log(`  Title: "${feed.title}"`);
      console.log(`  Description: "${feed.description}"`);
      
      // Check for missing accented characters
      const hasAccents = /[àáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/i.test(feed.title + feed.description);
      console.log(`  Has accented chars: ${hasAccents ? '✅ YES' : '❌ NO'}`);
    });
    
    // Check recent articles
    console.log('\n\n📄 RECENT ARTICLES (last 10):');
    const articlesStmt = db.prepare(`
      SELECT a.id, a.title, a.summary, f.title as feed_title 
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      ORDER BY a.id DESC 
      LIMIT 10
    `);
    const articles = articlesStmt.all() as any[];
    
    articles.forEach(article => {
      console.log(`\nArticle ${article.id} (${article.feed_title}):`);
      console.log(`  Title: "${article.title}"`);
      console.log(`  Summary: "${article.summary?.substring(0, 100)}..."`);
      
      // Check for missing accented characters
      const hasAccents = /[àáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/i.test(article.title + (article.summary || ''));
      console.log(`  Has accented chars: ${hasAccents ? '✅ YES' : '❌ NO'}`);
    });
    
    // Check for specific problematic patterns
    console.log('\n\n🔍 ENCODING PATTERNS:');
    const encodingStmt = db.prepare(`
      SELECT 
        f.title as feed_title,
        COUNT(CASE WHEN a.title LIKE '%%' THEN 1 END) as replacement_chars,
        COUNT(CASE WHEN a.title LIKE '%&%' THEN 1 END) as html_entities,
        COUNT(*) as total_articles
      FROM articles a 
      JOIN feeds f ON a.feed_id = f.id 
      GROUP BY f.id, f.title
      ORDER BY f.id
    `);
    const encodingStats = encodingStmt.all() as any[];
    
    encodingStats.forEach(stat => {
      console.log(`\n${stat.feed_title}:`);
      console.log(`  Total articles: ${stat.total_articles}`);
      console.log(`  With replacement chars (): ${stat.replacement_chars}`);
      console.log(`  With HTML entities (&): ${stat.html_entities}`);
    });
    
  } catch (error) {
    console.error('Error diagnosing encoding:', error);
  } finally {
    dbManager.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  diagnoseEncoding();
}

export { diagnoseEncoding };
