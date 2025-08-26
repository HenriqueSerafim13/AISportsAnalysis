import axios, { AxiosResponse } from 'axios';
import { OllamaRequest, OllamaResponse } from '../types';
import webSearchService, { WebSearchResult } from './webSearch';

export class OllamaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  async generateResponse(request: OllamaRequest): Promise<string> {
    try {
      console.log(`Sending request to Ollama at ${this.baseUrl}/api/generate`);
      console.log('Request payload:', JSON.stringify(request, null, 2));
      
      // Always use streaming for consistent behavior
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        { ...request, stream: true },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 300000, // 5 minutes timeout
        }
      );

      console.log('Ollama response status:', response.status);
      
      return new Promise((resolve, reject) => {
        let fullResponse = '';
        
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaResponse = JSON.parse(line);
                if (data.response) {
                  fullResponse += data.response;
                }
                
                if (data.done) {
                  console.log('Final response received:', fullResponse.substring(0, 200) + '...');
                  resolve(fullResponse);
                }
              } catch (parseError) {
                console.warn('Failed to parse Ollama response chunk:', parseError);
              }
            }
          }
        });

        response.data.on('end', () => {
          if (!fullResponse) {
            reject(new Error('No response received from Ollama'));
          }
        });

        response.data.on('error', (error: Error) => {
          console.error('Ollama stream error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  async generateStream(
    request: OllamaRequest,
    onChunk: (chunk: string, done: boolean) => void
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        { ...request, stream: true },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 300000, // 5 minutes timeout
        }
      );

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaResponse = JSON.parse(line);
              onChunk(data.response, data.done);
            } catch (parseError) {
              console.warn('Failed to parse Ollama response chunk:', parseError);
            }
          }
        }
      });

      response.data.on('end', () => {
        onChunk('', true);
      });

      response.data.on('error', (error: Error) => {
        console.error('Ollama stream error:', error);
        throw error;
      });
    } catch (error) {
      console.error('Ollama stream API error:', error);
      throw new Error(`Failed to generate stream: ${error}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((model: any) => model.name);
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }

  async generateResponseWithWebSearch(
    request: OllamaRequest,
    searchQuery?: string,
    context?: string
  ): Promise<{ response: string; searchResults?: WebSearchResult[] }> {
    try {
      let searchResults: WebSearchResult[] = [];
      
      // If a search query is provided, perform web search first
      if (searchQuery) {
        console.log(`Performing web search for: ${searchQuery}`);
        const searchResponse = await webSearchService.searchWithContext(
          searchQuery,
          context || '',
          5
        );
        searchResults = searchResponse.results;
        
        // Enhance the prompt with search results
        const searchContext = searchResults
          .map(result => `Source: ${result.source}\nTitle: ${result.title}\nContent: ${result.snippet}\nURL: ${result.url}`)
          .join('\n\n');
        
        request.prompt = `${request.prompt}\n\nWeb Search Results:\n${searchContext}\n\nPlease use the above search results to provide an informed response.`;
      }

      // Generate response using the enhanced prompt
      const response = await this.generateResponse(request);
      
      return {
        response,
        searchResults: searchResults.length > 0 ? searchResults : undefined
      };
    } catch (error) {
      console.error('Error in generateResponseWithWebSearch:', error);
      throw error;
    }
  }

  async generateStreamWithWebSearch(
    request: OllamaRequest,
    onChunk: (chunk: string, done: boolean) => void,
    searchQuery?: string,
    context?: string
  ): Promise<{ searchResults?: WebSearchResult[] }> {
    try {
      let searchResults: WebSearchResult[] = [];
      
      // If a search query is provided, perform web search first
      if (searchQuery) {
        console.log(`Performing web search for: ${searchQuery}`);
        const searchResponse = await webSearchService.searchWithContext(
          searchQuery,
          context || '',
          5
        );
        searchResults = searchResponse.results;
        
        // Enhance the prompt with search results
        const searchContext = searchResults
          .map(result => `Source: ${result.source}\nTitle: ${result.title}\nContent: ${result.snippet}\nURL: ${result.url}`)
          .join('\n\n');
        
        request.prompt = `${request.prompt}\n\nWeb Search Results:\n${searchContext}\n\nPlease use the above search results to provide an informed response.`;
      }

      // Generate streaming response using the enhanced prompt
      await this.generateStream(request, onChunk);
      
      return {
        searchResults: searchResults.length > 0 ? searchResults : undefined
      };
    } catch (error) {
      console.error('Error in generateStreamWithWebSearch:', error);
      throw error;
    }
  }
}

export default new OllamaService();
