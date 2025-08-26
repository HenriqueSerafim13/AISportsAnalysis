import express from 'express';
import ollamaService from '../services/ollama';
import webSearchService from '../services/webSearch';
import { OllamaRequest } from '../types';

const router = express.Router();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  searchWeb?: boolean;
  model?: string;
  systemPrompt?: string;
  conversationHistory?: ChatMessage[];
  debug?: boolean; // Add debug flag
}

interface ChatResponse {
  response: string;
  searchResults?: any[];
  conversationId?: string;
}

// In-memory storage for conversation history (in production, use a database)
const conversations = new Map<string, ChatMessage[]>();

// Function to determine if web search is needed
async function shouldSearchWeb(message: string, model: string): Promise<{ needsSearch: boolean; reason: string }> {
  try {
    // Create a prompt to evaluate if the question needs current information
    const evaluationPrompt = `You are an AI assistant that determines whether a user's question requires current, up-to-date information from the web.

Question: "${message}"

Analyze this question and respond with ONLY a JSON object in this exact format:
{
  "needsSearch": true/false,
  "reason": "brief explanation of why search is or isn't needed"
}

Consider these factors:
- Does it ask about current events, recent news, or time-sensitive information?
- Does it ask about recent developments in technology, science, or other fields?
- Does it ask about current prices, weather, or real-time data?
- Does it ask about factual information that might have changed recently?
- Is it a general knowledge question that doesn't require current information?

Examples:
- "What is the capital of France?" → needsSearch: false (static knowledge)
- "What are the latest AI developments?" → needsSearch: true (current information)
- "How does photosynthesis work?" → needsSearch: false (scientific fact)
- "What's the weather like today?" → needsSearch: true (real-time data)
- "Who won the last World Cup?" → needsSearch: true (recent event)
- "Hello" or "How are you?" → needsSearch: false (greeting/conversation)

CRITICAL: Respond with ONLY valid JSON. No thinking, no explanations, no other text.`;

    const ollamaRequest: OllamaRequest = {
      model,
      prompt: evaluationPrompt,
      system: 'You are a JSON-only response bot. You must respond with ONLY valid JSON in the exact format specified. No thinking, no explanations, no other text.',
      options: {
        temperature: 0.1, // Low temperature for consistent evaluation
        top_p: 0.9,
        max_tokens: 200
      }
    };

    const response = await ollamaService.generateResponse(ollamaRequest);
    
    try {
      // Clean the response to remove thinking tags and extract JSON
      let cleanResponse = response.trim();
      
      // Remove thinking tags if present
      if (cleanResponse.includes('<think>')) {
        const thinkMatch = cleanResponse.match(/<think>.*?<\/think>/s);
        if (thinkMatch) {
          cleanResponse = cleanResponse.replace(thinkMatch[0], '').trim();
        }
      }
      
      // Try to find JSON in the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      // Try to parse the cleaned response
      const evaluation = JSON.parse(cleanResponse);
      
      if (typeof evaluation.needsSearch === 'boolean' && typeof evaluation.reason === 'string') {
        return {
          needsSearch: evaluation.needsSearch,
          reason: evaluation.reason
        };
      }
    } catch (parseError) {
      console.log('Failed to parse AI evaluation, falling back to default logic');
    }

    // Fallback logic if AI evaluation fails
    const lowerMessage = message.toLowerCase();
    const currentInfoKeywords = [
      'latest', 'recent', 'current', 'today', 'now', 'latest news',
      'breaking', 'update', 'newest', 'trending', 'happening now',
      'this week', 'this month', 'this year', '2024', '2025'
    ];
    
    const hasCurrentInfoKeywords = currentInfoKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (hasCurrentInfoKeywords) {
      return {
        needsSearch: true,
        reason: 'Question contains keywords suggesting current information is needed'
      };
    }
    
    return {
      needsSearch: false,
      reason: 'Question appears to be about general knowledge that doesn\'t require current information'
    };
    
  } catch (error) {
    console.error('Error evaluating if web search is needed:', error);
    // Default to not searching if evaluation fails
    return {
      needsSearch: false,
      reason: 'Evaluation failed, defaulting to no search'
    };
  }
}

router.post('/chat', async (req, res) => {
  try {
    const { message, searchWeb = false, model = 'llama2', systemPrompt, conversationHistory, debug = false }: ChatRequest = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store conversation history
    const currentHistory = conversationHistory || [];
    currentHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Prepare the prompt
    let fullPrompt = message;
    if (currentHistory.length > 1) {
      const contextMessages = currentHistory.slice(-6); // Last 6 messages for context
      fullPrompt = contextMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n') + '\n\nUser: ' + message;
    }

    let response: string;
    let searchResults: any[] | undefined;
    let searchDecision: { needsSearch: boolean; reason: string } | undefined;

    if (searchWeb) {
      // First, evaluate if web search is actually needed
      searchDecision = await shouldSearchWeb(message, model);
      console.log(`Web search evaluation: ${searchDecision.needsSearch} - ${searchDecision.reason}`);
      
      if (searchDecision.needsSearch) {
        // Perform web search
        const searchQuery = message;
        const searchResponse = await webSearchService.searchWithContext(
          searchQuery,
          fullPrompt,
          5
        );
        searchResults = searchResponse.results;
        
        // Enhance the prompt with search results
        const searchContext = searchResults
          .map(result => `Source: ${result.source}\nTitle: ${result.title}\nContent: ${result.snippet}\nURL: ${result.url}`)
          .join('\n\n');
        
        fullPrompt = `${fullPrompt}\n\nWeb Search Results:\n${searchContext}\n\nPlease use the above search results to provide an informed response.`;
      } else {
        // Add the evaluation reason to the prompt but still generate a response
        fullPrompt = `${fullPrompt}\n\nNote: ${searchDecision.reason}. You can answer this question using your existing knowledge. Please provide a helpful response.`;
      }
    }

    const ollamaRequest: OllamaRequest = {
      model,
      prompt: fullPrompt,
      system: systemPrompt || 'You are a helpful AI assistant that can search the web for information and provide accurate, up-to-date answers. Always cite your sources when providing information from web search.',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000
      }
    };

    // Always generate the response, whether web search was performed or not
    response = await ollamaService.generateResponse(ollamaRequest);

    // Store assistant response
    currentHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    conversations.set(conversationId, currentHistory);

    const chatResponse: ChatResponse = {
      response,
      searchResults: searchResults || undefined,
      conversationId
    };

    res.json(chatResponse);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

router.options('/chat/stream', (req, res) => {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end();
});

router.post('/chat/stream', async (req, res) => {
  try {
    const { message, searchWeb = false, model = 'llama2', systemPrompt, conversationHistory, debug = false }: ChatRequest = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });

    // Create conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store conversation history
    const currentHistory = conversationHistory || [];
    currentHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Prepare the prompt
    let fullPrompt = message;
    if (currentHistory.length > 1) {
      const contextMessages = currentHistory.slice(-6); // Last 6 messages for context
      fullPrompt = contextMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n') + '\n\nUser: ' + message;
    }

    let searchResults: any[] | undefined;
    let searchDecision: { needsSearch: boolean; reason: string } | undefined;

    if (searchWeb) {
      // First, evaluate if web search is actually needed
      searchDecision = await shouldSearchWeb(message, model);
      console.log(`Web search evaluation: ${searchDecision.needsSearch} - ${searchDecision.reason}`);
      
      // Only send search decision to frontend if debug is enabled
      if (debug) {
        res.write(`data: ${JSON.stringify({ type: 'search_decision', decision: searchDecision })}\n\n`);
      }
      
      if (searchDecision.needsSearch) {
        // Perform web search
        const searchQuery = message;
        const searchResponse = await webSearchService.searchWithContext(
          searchQuery,
          fullPrompt,
          5
        );
        searchResults = searchResponse.results;
        
        // Enhance the prompt with search results
        const searchContext = searchResults
          .map(result => `Source: ${result.source}\nTitle: ${result.title}\nContent: ${result.snippet}\nURL: ${result.url}`)
          .join('\n\n');
        
        fullPrompt = `${fullPrompt}\n\nWeb Search Results:\n${searchContext}\n\nPlease use the above search results to provide an informed response.`;
      } else {
        // Add the evaluation reason to the prompt but still generate a response
        fullPrompt = `${fullPrompt}\n\nNote: ${searchDecision.reason}. You can answer this question using your existing knowledge. Please provide a helpful response.`;
      }
    }
    
    const ollamaRequest: OllamaRequest = {
      model,
      prompt: fullPrompt,
      system: systemPrompt || 'You are a helpful AI assistant that can search the web for information and provide accurate, up-to-date answers. Always cite your sources when providing information from web search.',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000
      }
    };
    
    // Always stream the response, whether web search was performed or not
    await ollamaService.generateStream(
      ollamaRequest,
      (chunk: string, done: boolean) => {
        if (chunk) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
        if (done) {
          res.write(`data: ${JSON.stringify({ type: 'done', conversationId, searchResults, searchDecision })}\n\n`);
          res.end();
        }
      }
    );

    conversations.set(conversationId, currentHistory);

  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process chat message' })}\n\n`);
    res.end();
  }
});

router.get('/models', async (req, res) => {
  try {
    const models = await ollamaService.listModels();
    res.json({ models });
  } catch (error) {
    console.error('Failed to list models:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const isHealthy = await ollamaService.checkHealth();
    res.json({ healthy: isHealthy });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ healthy: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
