import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function testFindByLinkBug() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Testing findByLink for False Positives ===');
    
    // First, let's check the current state
    const totalArticles = await ArticleRepository.getCount();
    console.log('Total articles in database:', totalArticles);
    
    const articlesFeed2 = await ArticleRepository.findByFeedId(2);
    console.log('Articles with feed_id = 2:', articlesFeed2.length);
    
    // Now let's fetch some articles from the Noticias feed
    console.log('\n=== Fetching RSS from Noticias Feed ===');
    const feed = await FeedRepository.findById(2);
    if (!feed) {
      console.error('Feed not found');
      return;
    }
    
    const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
    console.log(`Fetched ${articles.length} articles from RSS`);
    
    if (articles.length > 0) {
      console.log('\n=== Testing findByLink with RSS Articles ===');
      
      // Test the first 5 articles
      const testArticles = articles.slice(0, 5);
      
      for (let i = 0; i < testArticles.length; i++) {
        const article = testArticles[i];
        console.log(`\n--- Article ${i + 1} ---`);
        console.log(`Title: ${article.title?.substring(0, 50)}...`);
        console.log(`Link: ${article.link}`);
        console.log(`Feed ID before: ${article.feed_id}`);
        
        // Test findByLink before setting feed_id
        console.log('Testing findByLink before setting feed_id...');
        const existingBefore = await ArticleRepository.findByLink(article.link);
        console.log('findByLink result:', existingBefore ? 'FOUND (this is wrong!)' : 'NOT FOUND (correct)');
        
        if (existingBefore) {
          console.log('Found article details:', {
            id: existingBefore.id,
            title: existingBefore.title?.substring(0, 50),
            feed_id: existingBefore.feed_id,
            link: existingBefore.link
          });
        }
        
        // Set the feed_id
        article.feed_id = feed.id!;
        console.log(`Feed ID after setting: ${article.feed_id}`);
        
        // Test findByLink after setting feed_id
        console.log('Testing findByLink after setting feed_id...');
        const existingAfter = await ArticleRepository.findByLink(article.link);
        console.log('findByLink result:', existingAfter ? 'FOUND' : 'NOT FOUND');
        
        if (existingAfter) {
          console.log('Found article details:', {
            id: existingAfter.id,
            title: existingAfter.id,
            feed_id: existingAfter.feed_id,
            link: existingAfter.link
          });
        }
      }
      
      // Now let's test if any of these articles are actually in the database
      console.log('\n=== Checking if any test articles are actually in database ===');
      for (let i = 0; i < testArticles.length; i++) {
        const article = testArticles[i];
        const existing = await ArticleRepository.findByLink(article.link);
        if (existing) {
          console.log(`Article ${i + 1} EXISTS in database with ID: ${existing.id}, feed_id: ${existing.feed_id}`);
        } else {
          console.log(`Article ${i + 1} NOT in database (correct)`);
        }
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testFindByLinkBug();
