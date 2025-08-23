import DatabaseManager from './src/database';
import RSSService from './src/services/rss';
import FeedRepository from './src/repositories/FeedRepository';
import ArticleRepository from './src/repositories/ArticleRepository';

async function testFindByLink() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Testing findByLink Method ===');
    
    // First, let's check if there are any articles in the database
    const totalArticles = await ArticleRepository.getCount();
    console.log('Total articles in database:', totalArticles);
    
    // Let's check if there are any articles with feed_id = 2
    const articlesFeed2 = await ArticleRepository.findByFeedId(2);
    console.log('Articles with feed_id = 2:', articlesFeed2.length);
    
    if (articlesFeed2.length > 0) {
      console.log('Sample article from feed 2:', {
        id: articlesFeed2[0].id,
        title: articlesFeed2[0].title?.substring(0, 50),
        feed_id: articlesFeed2[0].feed_id,
        link: articlesFeed2[0].link
      });
    }
    
    // Now let's test the findByLink method with a sample link
    const testLink = 'https://www.zerozero.pt/noticias/tavernier-impoe-derrota-ao-wolves-de-vitor-pereira-brentford-e-burnley-estreiam-se-a-vencer/896136';
    
    console.log('\n=== Testing findByLink with test link ===');
    console.log('Test link:', testLink);
    
    const articleByLink = await ArticleRepository.findByLink(testLink);
    console.log('Article found by link:', articleByLink);
    
    if (articleByLink) {
      console.log('Article details:', {
        id: articleByLink.id,
        title: articleByLink.title?.substring(0, 50),
        feed_id: articleByLink.feed_id,
        link: articleByLink.link
      });
    } else {
      console.log('No article found with this link');
    }
    
    // Let's also test with a link that we know exists (from ESPN)
    const espnLink = 'https://www.espn.com/tennis/story/_/id/46043755/novak-djokovic-new-york-yankees-boston-red-sox-first-pitch-aaron-judge';
    
    console.log('\n=== Testing findByLink with ESPN link ===');
    console.log('ESPN link:', espnLink);
    
    const espnArticle = await ArticleRepository.findByLink(espnLink);
    console.log('ESPN article found by link:', espnArticle ? 'YES' : 'NO');
    
    if (espnArticle) {
      console.log('ESPN article details:', {
        id: espnArticle.id,
        title: espnArticle.title?.substring(0, 50),
        feed_id: espnArticle.feed_id,
        link: espnArticle.link
      });
    }
    
    // Let's check if there's a pattern - maybe all articles are being saved with feed_id = 0?
    console.log('\n=== Checking feed_id distribution ===');
    const allArticles = await ArticleRepository.findAll(1000, 0);
    
    const feedIdCounts: { [key: number]: number } = {};
    allArticles.forEach(article => {
      const feedId = article.feed_id || 0;
      feedIdCounts[feedId] = (feedIdCounts[feedId] || 0) + 1;
    });
    
    console.log('Feed ID distribution:', feedIdCounts);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testFindByLink();
