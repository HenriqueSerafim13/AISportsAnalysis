import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function testFeedId() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Testing Feed ID Assignment ===');
    const feed = await FeedRepository.findById(2); // Noticias feed
    if (!feed) {
      console.error('Feed not found');
      return;
    }
    
    console.log('Feed:', { id: feed.id, title: feed.title, url: feed.url });
    
    console.log('\n=== Fetching RSS Feed ===');
    const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
    console.log(`Fetched ${articles.length} articles`);
    
    if (articles.length > 0) {
      console.log('\n=== Testing Article Feed ID Assignment ===');
      const sampleArticle = articles[0];
      
      console.log('Before assignment:', {
        title: sampleArticle.title?.substring(0, 50),
        feed_id: sampleArticle.feed_id,
        link: sampleArticle.link
      });
      
      // Test the assignment
      sampleArticle.feed_id = feed.id!;
      
      console.log('After assignment:', {
        title: sampleArticle.title?.substring(0, 50),
        feed_id: sampleArticle.feed_id,
        link: sampleArticle.link
      });
      
      console.log('\n=== Testing Article Creation ===');
      const articleToSave = {
        ...sampleArticle,
        feed_id: feed.id!
      };
      
      console.log('Article to save:', {
        title: articleToSave.title?.substring(0, 50),
        feed_id: articleToSave.feed_id,
        link: articleToSave.link
      });
      
      const articleId = await ArticleRepository.create(articleToSave);
      console.log('Article created with ID:', articleId);
      
      console.log('\n=== Verifying Saved Article ===');
      const savedArticle = await ArticleRepository.findById(articleId);
      console.log('Saved article:', {
        id: savedArticle?.id,
        title: savedArticle?.title?.substring(0, 50),
        feed_id: savedArticle?.feed_id,
        link: savedArticle?.link
      });
      
      console.log('\n=== Testing findByLink ===');
      const articleByLink = await ArticleRepository.findByLink(articleToSave.link);
      console.log('Article found by link:', {
        id: articleByLink?.id,
        title: articleByLink?.title?.substring(0, 50),
        feed_id: articleByLink?.feed_id,
        link: articleByLink?.link
      });
      
      console.log('\n=== Cleaning up ===');
      await ArticleRepository.delete(articleId);
      console.log('Test article deleted');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testFeedId();
