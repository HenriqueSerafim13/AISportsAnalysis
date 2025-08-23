import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function debugRSS() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Testing RSS Fetch for Noticias Feed ===');
    const feed = await FeedRepository.findById(2); // Noticias feed
    if (!feed) {
      console.error('Feed not found');
      return;
    }
    
    console.log('Feed:', feed);
    
    console.log('\n=== Fetching RSS Feed ===');
    const { feed: feedData, articles } = await RSSService.fetchFeed(feed.url);
    console.log(`Fetched ${articles.length} articles from RSS`);
    
    if (articles.length > 0) {
      console.log('\n=== Sample Article ===');
      const sampleArticle = articles[0];
      console.log('Title:', sampleArticle.title);
      console.log('Link:', sampleArticle.link);
      console.log('Content length:', sampleArticle.content?.length || 0);
      console.log('Summary length:', sampleArticle.summary?.length || 0);
      console.log('Author:', sampleArticle.author);
      console.log('Published at:', sampleArticle.published_at);
      
      console.log('\n=== Testing Duplicate Check ===');
      const existing = await ArticleRepository.findByLink(sampleArticle.link);
      console.log('Existing article found:', existing ? 'YES' : 'NO');
      
      if (!existing) {
        console.log('\n=== Testing Article Creation ===');
        const articleToSave = {
          ...sampleArticle,
          feed_id: feed.id!
        };
        
        console.log('Article to save:', {
          feed_id: articleToSave.feed_id,
          title: articleToSave.title,
          link: articleToSave.link,
          content_length: articleToSave.content?.length || 0
        });
        
        const articleId = await ArticleRepository.create(articleToSave);
        console.log('Article created with ID:', articleId);
        
        console.log('\n=== Verifying Article was Saved ===');
        const savedArticle = await ArticleRepository.findById(articleId);
        console.log('Saved article found:', savedArticle ? 'YES' : 'NO');
        if (savedArticle) {
          console.log('Saved article ID:', savedArticle.id);
          console.log('Saved article title:', savedArticle.title);
        }
        
        console.log('\n=== Testing findByLink Again ===');
        const articleByLink = await ArticleRepository.findByLink(sampleArticle.link);
        console.log('Article found by link after save:', articleByLink ? 'YES' : 'NO');
        
        console.log('\n=== Cleaning up test article ===');
        await ArticleRepository.delete(articleId);
        console.log('Test article deleted');
      }
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    process.exit(0);
  }
}

debugRSS();
