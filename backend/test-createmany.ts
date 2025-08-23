import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function testCreateMany() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Testing createMany Method ===');
    
    // First, let's check the current state
    const totalArticles = await ArticleRepository.getCount();
    console.log('Total articles before test:', totalArticles);
    
    const articlesFeed2 = await ArticleRepository.findByFeedId(2);
    console.log('Articles with feed_id = 2 before test:', articlesFeed2.length);
    
    // Now let's fetch some articles from the Noticias feed
    console.log('\n=== Fetching RSS from Noticias Feed ===');
    const feed = await FeedRepository.findById(2);
    if (!feed) {
      console.error('Feed not found');
      return;
    }
    
    console.log('Feed:', { id: feed.id, title: feed.title, url: feed.url });
    
    const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
    console.log(`Fetched ${articles.length} articles from RSS`);
    
    if (articles.length > 0) {
      console.log('\n=== Testing Article Creation ===');
      
      // Take the first 3 articles for testing
      const testArticles = articles.slice(0, 3);
      
      console.log(`Testing with ${testArticles.length} articles:`);
      testArticles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title?.substring(0, 50)}...`);
        console.log(`   Link: ${article.link}`);
        console.log(`   Feed ID before: ${article.feed_id}`);
      });
      
      // Set the feed_id for each article
      testArticles.forEach(article => {
        article.feed_id = feed.id!;
      });
      
      console.log('\n=== After setting feed_id ===');
      testArticles.forEach((article, index) => {
        console.log(`${index + 1}. Feed ID after: ${article.feed_id}`);
      });
      
      // Test the createMany method
      console.log('\n=== Calling createMany ===');
      try {
        const articleIds = await ArticleRepository.createMany(testArticles);
        console.log('createMany succeeded! Article IDs:', articleIds);
        
        // Verify the articles were created
        console.log('\n=== Verifying Articles Were Created ===');
        const newTotalArticles = await ArticleRepository.getCount();
        console.log('Total articles after test:', newTotalArticles);
        console.log('Articles added:', newTotalArticles - totalArticles);
        
        const newArticlesFeed2 = await ArticleRepository.findByFeedId(2);
        console.log('Articles with feed_id = 2 after test:', newArticlesFeed2.length);
        console.log('Articles added to feed 2:', newArticlesFeed2.length - articlesFeed2.length);
        
        // Show the newly created articles
        if (newArticlesFeed2.length > articlesFeed2.length) {
          console.log('\n=== Newly Created Articles ===');
          const newArticles = newArticlesFeed2.slice(articlesFeed2.length);
          newArticles.forEach((article, index) => {
            console.log(`${index + 1}. ID: ${article.id}, Title: ${article.title?.substring(0, 50)}...`);
            console.log(`   Feed ID: ${article.feed_id}, Link: ${article.link}`);
          });
        }
        
      } catch (error: any) {
        console.error('createMany failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testCreateMany();
