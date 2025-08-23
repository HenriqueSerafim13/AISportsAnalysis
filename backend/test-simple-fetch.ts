import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function testSimpleFetch() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Current Articles Count ===');
    const totalArticles = await ArticleRepository.getCount();
    console.log('Total articles in database:', totalArticles);
    
    console.log('\n=== Testing RSS Fetch Directly ===');
    const testUrl = 'https://www.zerozero.pt/rss/noticias.php';
    
    console.log('Fetching from:', testUrl);
    const { feed: feedData, articles } = await RSSService.fetchFeed(testUrl);
    console.log(`Fetched ${articles.length} articles`);
    
    if (articles.length > 0) {
      console.log('\n=== Sample Article Data ===');
      const sample = articles[0];
      console.log('Title:', sample.title?.substring(0, 50));
      console.log('Link:', sample.link);
      console.log('Content length:', sample.content?.length || 0);
      console.log('Summary length:', sample.summary?.length || 0);
      console.log('Author:', sample.author);
      console.log('Published at:', sample.published_at);
      
      console.log('\n=== Testing Article Save ===');
      const articleToSave = {
        ...sample,
        feed_id: 2 // Noticias feed ID
      };
      
      console.log('Attempting to save article...');
      const articleId = await ArticleRepository.create(articleToSave);
      console.log('Article saved with ID:', articleId);
      
      console.log('\n=== Verifying Save ===');
      const savedArticle = await ArticleRepository.findById(articleId);
      console.log('Saved article found:', savedArticle ? 'YES' : 'NO');
      
      if (savedArticle) {
        console.log('Article ID:', savedArticle.id);
        console.log('Article title:', savedArticle.title);
        console.log('Feed ID:', savedArticle.feed_id);
      }
      
      console.log('\n=== Final Article Count ===');
      const finalCount = await ArticleRepository.getCount();
      console.log('Total articles after save:', finalCount);
      
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

testSimpleFetch();
