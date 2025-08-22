import DatabaseManager from './index';
import FeedRepository from '../repositories/FeedRepository';

const sampleFeeds = [
  {
    url: 'https://feeds.bbci.co.uk/sport/rss.xml',
    title: 'BBC Sport',
    description: 'Latest sports news from BBC',
    enabled: true,
  },
  {
    url: 'https://www.espn.com/espn/rss/news',
    title: 'ESPN News',
    description: 'Sports news from ESPN',
    enabled: true,
  },
  {
    url: 'https://feeds.feedburner.com/ESPNcom-Tennis',
    title: 'ESPN Tennis',
    description: 'Tennis news from ESPN',
    enabled: true,
  },
];

async function seed() {
  try {
    console.log('Seeding database with sample data...');
    
    // Initialize database
    const dbManager = DatabaseManager.getInstance();
    const feedRepo = FeedRepository;
    
    // Add sample feeds
    for (const feed of sampleFeeds) {
      try {
        const existingFeed = await feedRepo.findByUrl(feed.url);
        if (!existingFeed) {
          await feedRepo.create(feed);
          console.log(`Added feed: ${feed.title}`);
        } else {
          console.log(`Feed already exists: ${feed.title}`);
        }
      } catch (error) {
        console.error(`Failed to add feed ${feed.title}:`, error);
      }
    }
    
    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
