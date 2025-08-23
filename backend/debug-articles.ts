import DatabaseManager from './src/database';
import ArticleRepository from './src/repositories/ArticleRepository';
import FeedRepository from './src/repositories/FeedRepository';

async function debugArticles() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Current Feeds ===');
    const feeds = await FeedRepository.findAll();
    console.log('Feeds:', feeds);
    
    console.log('\n=== Current Articles Count ===');
    const totalArticles = await ArticleRepository.getCount();
    console.log('Total articles in database:', totalArticles);
    
    console.log('\n=== Articles by Feed ===');
    for (const feed of feeds) {
      const count = await ArticleRepository.getCountByFeedId(feed.id!);
      console.log(`Feed "${feed.title}" (ID: ${feed.id}): ${count} articles`);
    }
    
    console.log('\n=== Testing Article Creation ===');
    const testArticle = {
      feed_id: feeds[0].id!,
      title: 'Test Article',
      link: 'https://example.com/test-article',
      content: 'This is a test article content',
      summary: 'Test summary',
      author: 'Test Author',
      published_at: new Date().toISOString(),
      raw_json: JSON.stringify({ test: true })
    };
    
    console.log('Creating test article...');
    const articleId = await ArticleRepository.create(testArticle);
    console.log('Test article created with ID:', articleId);
    
    console.log('\n=== Retrieving Test Article ===');
    const retrievedArticle = await ArticleRepository.findById(articleId);
    console.log('Retrieved article:', retrievedArticle);
    
    console.log('\n=== Testing findByLink ===');
    const articleByLink = await ArticleRepository.findByLink(testArticle.link);
    console.log('Article found by link:', articleByLink);
    
    console.log('\n=== Updated Articles Count ===');
    const newTotalArticles = await ArticleRepository.getCount();
    console.log('Total articles after test:', newTotalArticles);
    
    console.log('\n=== Cleaning up test article ===');
    await ArticleRepository.delete(articleId);
    console.log('Test article deleted');
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    process.exit(0);
  }
}

debugArticles();
