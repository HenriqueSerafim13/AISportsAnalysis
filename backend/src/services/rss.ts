import Parser from 'rss-parser';
import { Feed, Article } from '../types';

export class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Sports-Analysis-App/1.0',
      },
    });
  }

  async fetchFeed(url: string): Promise<{ feed: Feed; articles: Article[] }> {
    try {
      console.log(`Fetching RSS feed: ${url}`);
      
      const parsedFeed = await this.parser.parseURL(url);
      
      const feed: Feed = {
        url,
        title: parsedFeed.title || 'Unknown Feed',
        description: parsedFeed.description || '',
        enabled: true,
      };

      const articles: Article[] = (parsedFeed.items || []).map((item, index) => ({
        feed_id: 0, // Will be set when saving to database
        title: item.title || `Article ${index + 1}`,
        link: item.link || '',
        content: item.content || item.contentSnippet || '',
        summary: item.contentSnippet || '',
        author: item.creator || item.author || '',
        published_at: item.pubDate || item.isoDate || new Date().toISOString(),
        raw_json: JSON.stringify(item),
      }));

      console.log(`Fetched ${articles.length} articles from ${url}`);
      
      return { feed, articles };
    } catch (error) {
      console.error(`Failed to fetch RSS feed ${url}:`, error);
      throw new Error(`Failed to fetch RSS feed: ${error}`);
    }
  }

  async validateFeed(url: string): Promise<boolean> {
    try {
      await this.parser.parseURL(url);
      return true;
    } catch (error) {
      console.error(`Invalid RSS feed ${url}:`, error);
      return false;
    }
  }
}

export default new RSSService();
