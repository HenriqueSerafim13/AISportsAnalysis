import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function testJobManagerSimulation() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Simulating JobManager RSS Fetch ===');
    
    // First, let's check the current state
    const totalArticles = await ArticleRepository.getCount();
    console.log('Total articles before test:', totalArticles);
    
    const articlesFeed2 = await ArticleRepository.findByFeedId(2);
    console.log('Articles with feed_id = 2 before test:', articlesFeed2.length);
    
    // Now let's simulate exactly what the JobManager does
    console.log('\n=== Fetching RSS Feed ===');
    const feed = await FeedRepository.findById(2);
    if (!feed) {
      console.error('Feed not found');
      return;
    }
    
    console.log('Feed:', { id: feed.id, title: feed.title, url: feed.url });
    
    const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
    console.log(`Fetched ${articles.length} articles from RSS`);
    
    // Now simulate the JobManager's logic exactly
    console.log('\n=== Simulating JobManager Logic ===');
    
    // Save new articles
    const newArticles = [];
    let existingCount = 0;
    
    for (const article of articles) {
      const existing = await ArticleRepository.findByLink(article.link);
      if (!existing) {
        article.feed_id = feed.id!;
        newArticles.push(article);
      } else {
        existingCount++;
        console.log(`Found existing article: ${article.title?.substring(0, 50)}... (ID: ${existing.id}, feed_id: ${existing.feed_id})`);
      }
    }
    
    console.log(`\nResults:`);
    console.log(`Total articles from RSS: ${articles.length}`);
    console.log(`Existing articles found: ${existingCount}`);
    console.log(`New articles to save: ${newArticles.length}`);
    
    if (newArticles.length > 0) {
      console.log('\n=== Saving New Articles ===');
      try {
        const articleIds = await ArticleRepository.createMany(newArticles);
        console.log(`Successfully saved ${articleIds.length} articles with IDs:`, articleIds);
        
        // Verify the articles were created
        console.log('\n=== Verifying Articles Were Created ===');
        const newTotalArticles = await ArticleRepository.getCount();
        console.log('Total articles after test:', newTotalArticles);
        console.log('Articles added:', newTotalArticles - totalArticles);
        
        const newArticlesFeed2 = await ArticleRepository.findByFeedId(2);
        console.log('Articles with feed_id = 2 after test:', newArticlesFeed2.length);
        console.log('Articles added to feed 2:', newArticlesFeed2.length - articlesFeed2.length);
        
      } catch (error: any) {
        console.error('createMany failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
      }
    } else {
      console.log('No new articles to save');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testJobManagerSimulation();
