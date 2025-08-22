import axios, { AxiosResponse } from 'axios';
import { OllamaRequest, OllamaResponse } from '../types';

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
}

export default new OllamaService();
