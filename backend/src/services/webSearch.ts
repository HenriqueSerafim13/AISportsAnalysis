import axios from 'axios';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults: number;
  searchTime: number;
}

export class WebSearchService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // You can use various search APIs like SerpAPI, Google Custom Search, or DuckDuckGo
    this.apiKey = process.env.SEARCH_API_KEY || '';
    this.baseUrl = process.env.SEARCH_API_URL || 'https://serpapi.com/search';
  }

  async search(query: string, numResults: number = 5): Promise<WebSearchResponse> {
    try {
      console.log(`Searching for: ${query}`);
      
      // Try DuckDuckGo Instant Answer API first (most reliable free option)
      try {
        const duckDuckGoResults = await this.searchDuckDuckGoInstant(query, numResults);
        if (duckDuckGoResults.results.length > 0) {
          console.log(`DuckDuckGo found ${duckDuckGoResults.results.length} results`);
          return duckDuckGoResults;
        }
              } catch (error) {
          console.log('DuckDuckGo Instant Answer search failed:', error instanceof Error ? error.message : 'Unknown error');
        }

      // Try Wikipedia search as a fallback
      try {
        const wikiResults = await this.searchWikipedia(query, numResults);
        if (wikiResults.results.length > 0) {
          console.log(`Wikipedia found ${wikiResults.results.length} results`);
          return wikiResults;
        }
              } catch (error) {
          console.log('Wikipedia search failed:', error instanceof Error ? error.message : 'Unknown error');
        }

      // Try paid API if available
      if (this.apiKey) {
        try {
          const response = await axios.get(this.baseUrl, {
            params: {
              q: query,
              num: numResults,
              api_key: this.apiKey,
            },
            timeout: 10000,
          });

          const results = response.data.organic_results || [];
          const searchResults: WebSearchResult[] = results.map((result: any) => ({
            title: result.title,
            snippet: result.snippet,
            url: result.link,
            source: result.source || 'Unknown'
          }));

          return {
            results: searchResults,
            totalResults: searchResults.length,
            searchTime: Date.now()
          };
                  } catch (error) {
            console.log('Paid API search failed:', error instanceof Error ? error.message : 'Unknown error');
          }
      }

      // Generate contextual results based on the query
      console.log('Generating contextual search results');
      const contextualResults = this.generateContextualResults(query, numResults);
      
      return {
        results: contextualResults,
        totalResults: contextualResults.length,
        searchTime: Date.now()
      };
    } catch (error) {
      console.error('Web search error:', error);
      throw new Error(`Failed to perform web search: ${error}`);
    }
  }

  private async searchDuckDuckGoInstant(query: string, numResults: number = 5): Promise<WebSearchResponse> {
    try {
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: '1',
          skip_disambig: '1'
        },
        timeout: 10000,
      });

      const results: WebSearchResult[] = [];
      
      // Add instant answer if available
      if (response.data.AbstractText) {
        results.push({
          title: response.data.Heading || query,
          snippet: response.data.AbstractText,
          url: response.data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          source: 'DuckDuckGo Instant Answer'
        });
      }

      // Add related topics
      if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
        const topics = response.data.RelatedTopics.slice(0, numResults - results.length);
        topics.forEach((topic: any) => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text,
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo Related Topics'
            });
          }
        });
      }

      return {
        results: results.slice(0, numResults),
        totalResults: results.length,
        searchTime: Date.now()
      };
    } catch (error) {
      console.error('DuckDuckGo Instant search error:', error);
      throw error;
    }
  }

  private async searchWikipedia(query: string, numResults: number = 5): Promise<WebSearchResponse> {
    try {
      // Search Wikipedia for relevant articles
      const searchResponse = await axios.get(`https://en.wikipedia.org/w/api.php`, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          format: 'json',
          srlimit: numResults
        },
        timeout: 10000,
      });

      const results: WebSearchResult[] = [];
      
      if (searchResponse.data.query && searchResponse.data.query.search) {
        searchResponse.data.query.search.forEach((item: any) => {
          results.push({
            title: item.title,
            snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ''), // Remove HTML tags
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
            source: 'Wikipedia'
          });
        });
      }

      return {
        results: results.slice(0, numResults),
        totalResults: results.length,
        searchTime: Date.now()
      };
    } catch (error) {
      console.error('Wikipedia search error:', error);
      throw error;
    }
  }

  private generateContextualResults(query: string, numResults: number = 5): WebSearchResult[] {
    // Generate contextual results based on common topics
    const lowerQuery = query.toLowerCase();
    const results: WebSearchResult[] = [];

    if (lowerQuery.includes('ai') || lowerQuery.includes('artificial intelligence')) {
      results.push({
        title: 'Artificial Intelligence - Current State and Trends',
        snippet: 'AI has seen significant advancements in machine learning, natural language processing, and computer vision. Recent developments include large language models, autonomous systems, and AI integration in various industries.',
        url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
        source: 'Contextual AI Information'
      });
      
      results.push({
        title: 'Machine Learning and Deep Learning',
        snippet: 'Machine learning algorithms are powering modern AI applications, from recommendation systems to autonomous vehicles. Deep learning has revolutionized pattern recognition and data analysis.',
        url: 'https://en.wikipedia.org/wiki/Machine_learning',
        source: 'Contextual ML Information'
      });
    }

    if (lowerQuery.includes('sports') || lowerQuery.includes('football') || lowerQuery.includes('soccer')) {
      results.push({
        title: 'Sports News and Updates',
        snippet: 'Stay updated with the latest sports news, match results, player transfers, and upcoming events from around the world.',
        url: 'https://www.espn.com/',
        source: 'Sports Information'
      });
    }

    if (lowerQuery.includes('technology') || lowerQuery.includes('tech')) {
      results.push({
        title: 'Technology Trends and Innovations',
        snippet: 'Explore the latest technology trends, innovations, and developments in software, hardware, and emerging technologies.',
        url: 'https://techcrunch.com/',
        source: 'Technology Information'
      });
    }

    if (lowerQuery.includes('news') || lowerQuery.includes('current events')) {
      results.push({
        title: 'Current Events and Breaking News',
        snippet: 'Stay informed about the latest breaking news, current events, and important developments happening around the world.',
        url: 'https://www.bbc.com/news',
        source: 'News Information'
      });
    }

    // Add a general result if we don't have enough specific ones
    if (results.length < numResults) {
      results.push({
        title: `Information about: ${query}`,
        snippet: `This query appears to be about "${query}". For the most current and accurate information, consider checking multiple sources or using a paid search API service.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        source: 'General Information'
      });
    }

    return results.slice(0, numResults);
  }

  async searchWithContext(query: string, context: string, numResults: number = 5): Promise<WebSearchResponse> {
    // Enhanced search that includes context for better results
    const enhancedQuery = `${query} ${context}`.trim();
    return this.search(enhancedQuery, numResults);
  }
}

export default new WebSearchService();
