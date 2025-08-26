# AI Chat with Smart Web Search

This project now includes a powerful AI chat interface that integrates with Ollama for AI responses and includes **intelligent web search decision-making** for retrieving current information only when necessary.

## Features

- **AI Chat Interface**: Chat with various Ollama models (llama2, mistral, etc.)
- **Smart Web Search Integration**: AI automatically evaluates if web search is needed before searching
- **Real-time Streaming**: Responses stream in real-time for better user experience
- **Conversation History**: Maintains context across multiple messages
- **Customizable System Prompts**: Set custom behavior for the AI
- **Source Attribution**: View and visit web sources used by the AI
- **Smart Thinking Indicator**: Shows when AI is processing with auto-collapse
- **Search Decision Transparency**: See exactly why the AI decided to search or not search

## Smart Web Search System

### How It Works

1. **Question Evaluation**: When you ask a question with web search enabled, the AI first evaluates whether web search is actually needed
2. **Intelligent Decision**: The AI analyzes your question using these criteria:
   - Does it ask about current events, recent news, or time-sensitive information?
   - Does it ask about recent developments in technology, science, or other fields?
   - Does it ask about current prices, weather, or real-time data?
   - Does it ask about factual information that might have changed recently?
   - Is it a general knowledge question that doesn't require current information?
3. **Smart Action**: Based on the evaluation:
   - **If web search needed**: Performs search and provides informed response with sources
   - **If no search needed**: Answers from knowledge base (faster, more efficient)
4. **Transparency**: Shows you exactly why the decision was made

### Examples

| Question | AI Decision | Reason |
|----------|-------------|---------|
| "What is the capital of France?" | ❌ No web search | Static knowledge that doesn't change |
| "How does photosynthesis work?" | ❌ No web search | Scientific fact well understood for years |
| "What are the latest AI developments?" | ✅ Web search needed | Requires current, up-to-date information |
| "What's the weather like today?" | ✅ Web search needed | Real-time data required |
| "Who won the last World Cup?" | ✅ Web search needed | Recent event information |

## Setup

### 1. Install Ollama

First, install Ollama on your system:

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### 2. Pull a Model

Pull a model you want to use:

```bash
ollama pull llama2
# or
ollama pull mistral
# or
ollama pull codellama
```

### 3. Start Ollama

```bash
ollama serve
```

### 4. Environment Configuration

Copy the example environment file and configure it:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set:

```env
OLLAMA_URL=http://localhost:11434
```

### 5. Start the Backend

```bash
cd backend
npm install
npm run dev
```

### 6. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usage

### Basic Chat

1. Navigate to the Chat page in your application
2. Type your message in the input field
3. Press Enter or click Send
4. The AI will respond using the selected model

### Smart Web Search

1. Enable "Smart Web Search" in the settings panel
2. Ask any question - the AI will automatically decide if web search is needed
3. View the AI's evaluation decision and reasoning
4. Get responses either from web search (with sources) or from knowledge base
5. No more unnecessary web searches for static information!

### Settings

- **AI Model**: Select from available Ollama models
- **Smart Web Search**: Toggle intelligent web search functionality
- **System Prompt**: Customize AI behavior and role
- **Health Check**: Monitor Ollama service status

## Web Search Configuration

The system now includes multiple free search options that work without API keys:

### Free Search APIs (No API Key Required)

1. **DuckDuckGo Instant Answer API**
   - Provides instant answers and related topics
   - Most reliable free option
   - No rate limiting

2. **Wikipedia Search API**
   - Searches Wikipedia articles
   - Great for educational and factual queries
   - Comprehensive coverage

3. **Contextual Results Generation**
   - Smart fallback when external APIs fail
   - Generates relevant information based on query content
   - Covers common topics like AI, sports, technology, news

### Paid API Options (Optional)

If you want even better results, you can still use paid APIs:

1. **SerpAPI** (Recommended)
   - Sign up at [SerpAPI](https://serpapi.com/)
   - Get your API key
   - Add to `.env`:
   ```env
   SEARCH_API_KEY=your_api_key_here
   SEARCH_API_URL=https://serpapi.com/search
   ```

2. **Google Custom Search**
   - Set up Google Custom Search API
   - Configure the search service in `backend/src/services/webSearch.ts`
   - Update the API endpoints and response parsing

### Search Priority

The system tries search methods in this order:
1. DuckDuckGo Instant Answer API
2. Wikipedia Search API
3. Paid API (if configured)
4. Contextual Results Generation (fallback)

## Frontend Improvements

### Smart Search Evaluation

- **Evaluation Phase**: Shows "Evaluating if web search is needed..." while AI analyzes the question
- **Decision Display**: Clear explanation of why web search was or wasn't performed
- **Transparency**: See the AI's reasoning for each decision
- **Efficiency**: No unnecessary web searches for static knowledge

### Thinking Indicator

- **Smart Display**: Shows "Thinking..." when AI is processing
- **Auto-collapse**: Automatically disappears when streaming begins
- **Visual Feedback**: Lower emphasis styling with subtle opacity
- **Search Status**: Shows "Searching web..." when web search is enabled

### User Experience

- **Real-time Updates**: See AI responses as they're generated
- **Source Attribution**: Clickable links to web sources (when search is performed)
- **Conversation Flow**: Smooth transitions between evaluation, thinking, and responding
- **Error Handling**: Graceful fallbacks when search methods fail

## API Endpoints

- `POST /api/chat/chat` - Send a chat message
- `POST /api/chat/chat/stream` - Stream chat response with search decisions
- `GET /api/chat/models` - List available models
- `GET /api/chat/health` - Check Ollama health

## Troubleshooting

### Ollama Not Responding

1. Check if Ollama is running: `ollama list`
2. Verify the URL in your `.env` file
3. Check Ollama logs for errors

### Web Search Not Working

1. Ensure smart web search is enabled in settings
2. Check browser console for errors
3. The system will automatically fall back to contextual results
4. Verify API keys if using paid services

### Model Not Found

1. Pull the model: `ollama pull modelname`
2. Check available models: `ollama list`
3. Restart the backend after adding new models

## Development

### Adding New Search Providers

1. Create a new method in `backend/src/services/webSearch.ts`
2. Implement the search interface
3. Add it to the search priority chain
4. Add configuration options to `.env` if needed

### Customizing AI Behavior

1. Modify system prompts in the chat interface
2. Update the default system prompt in `backend/src/routes/chat.ts`
3. Add new model parameters in the Ollama request

### Frontend Customization

1. Modify the thinking indicator styling in `frontend/src/pages/Chat.tsx`
2. Adjust the search status display
3. Customize the chat bubble appearance

## Security Notes

- Web search results are processed by the AI before being sent to the user
- No raw search results are stored in the database
- API keys should be kept secure and not committed to version control
- Free APIs have built-in rate limiting and security measures
- Consider rate limiting for production use

## Performance

- **Smart Evaluation**: Only searches when necessary, saving time and resources
- **Streaming Responses**: Provides immediate feedback
- **Web search results**: Cached in memory during the conversation
- **Free APIs**: Have reasonable response times
- **Contextual Fallbacks**: Ensure responses even when external services fail
- **Consider implementing Redis**: For production conversation storage
- **Monitor Ollama model performance**: And adjust parameters as needed

## Recent Updates

### v3.0 - Smart Web Search Evaluation
- ✅ AI automatically evaluates if web search is needed
- ✅ Intelligent decision-making based on question content
- ✅ Transparent reasoning for search decisions
- ✅ Faster responses for static knowledge questions
- ✅ More efficient resource usage
- ✅ Enhanced user experience with clear decision explanations

### v2.0 - Free Web Search Integration
- ✅ Added DuckDuckGo Instant Answer API (free, no API key)
- ✅ Added Wikipedia Search API (free, no API key)
- ✅ Implemented smart contextual results generation
- ✅ Improved error handling and fallback mechanisms
- ✅ Enhanced frontend thinking indicator with auto-collapse
- ✅ Added search status indicators in the sidebar

### v1.0 - Basic Chat Functionality
- ✅ Ollama integration with multiple models
- ✅ Streaming chat responses
- ✅ Conversation history management
- ✅ Customizable system prompts
- ✅ Basic web search with paid APIs
