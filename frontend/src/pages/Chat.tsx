import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Link,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Web as WebIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { chatApi } from '../services/api';
import { ChatMessage, WebSearchResult } from '../types';

interface SearchDecision {
  needsSearch: boolean;
  reason: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamResponses, setStreamResponses] = useState(true);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ollamaHealth, setOllamaHealth] = useState<boolean | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [searchDecision, setSearchDecision] = useState<SearchDecision | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [debugMode, setDebugMode] = useState(false); // Add debug mode state
  const [collapsedThinkSections, setCollapsedThinkSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadModels();
    checkHealth();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('State changed:', { 
      isLoading, 
      isThinking, 
      isEvaluating, 
      currentStreamingMessage: currentStreamingMessage.length,
      messagesCount: messages.length
    });
  }, [isLoading, isThinking, isEvaluating, currentStreamingMessage, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModels = async () => {
    try {
      const models = await chatApi.getModels();
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setError('Failed to load available models');
    }
  };

  const checkHealth = async () => {
    try {
      const health = await chatApi.checkHealth();
      setOllamaHealth(health);
    } catch (error) {
      setOllamaHealth(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    console.log('Starting message send, current states:', { isLoading, isThinking, isEvaluating, currentStreamingMessage: currentStreamingMessage.length });

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsThinking(true);
    setIsEvaluating(true);
    setError(null);
    setCurrentStreamingMessage('');
    setSearchDecision(null);

    console.log('States after setting:', { isLoading: true, isThinking: true, isEvaluating: true, currentStreamingMessage: '' });

    try {
      if (streamResponses) {
        // Capture the final message content
        let finalMessageContent = '';
        
        await chatApi.sendMessageStream(
          {
            message: inputMessage,
            searchWeb: enableWebSearch,
            model: selectedModel,
            systemPrompt: systemPrompt,
            conversationHistory: messages,
            debug: debugMode, // Pass debug flag
          },
          (chunk: string) => {
            console.log('Chunk received:', chunk);
            // First chunk received - evaluation is done, but still thinking
            if (currentStreamingMessage === '') {
              console.log('First chunk received, setting isEvaluating to false');
              setIsEvaluating(false);
              // Keep thinking state true while streaming
              setIsThinking(true);
            }
            // Use functional update to avoid stale state issues
            setCurrentStreamingMessage(prev => {
              const newMessage = prev + chunk;
              finalMessageContent = newMessage; // Capture the final content
              console.log('Setting currentStreamingMessage to:', newMessage);
              return newMessage;
            });
          },
          (conversationId: string, searchResults?: WebSearchResult[], decision?: SearchDecision) => {
            console.log('Streaming complete, final message:', finalMessageContent);
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: finalMessageContent, // Use the captured content
              timestamp: new Date(),
              searchResults,
            };
            setMessages(prev => [...prev, assistantMessage]);
            // Don't clear currentStreamingMessage immediately - let it stay visible
            // until the next render cycle
            setTimeout(() => {
              setCurrentStreamingMessage('');
            }, 100);
            setIsLoading(false);
            setIsThinking(false); // Only stop thinking when response is complete
            setIsEvaluating(false);
            if (decision && debugMode) { // Only set if debug mode is on
              setSearchDecision(decision);
            }
          },
          (error: string) => {
            setError(error);
            setIsLoading(false);
            setIsThinking(false);
            setIsEvaluating(false);
            setCurrentStreamingMessage('');
          },
          (decision: SearchDecision) => {
            if (debugMode) { // Only set if debug mode is on
              setSearchDecision(decision);
            }
            setIsEvaluating(false);
            // Keep thinking state true until we start receiving chunks
            if (decision.needsSearch) {
              setIsThinking(true);
            } else {
              setIsThinking(true); // Keep thinking until response starts
            }
          }
        );
      } else {
        // Use regular chat without web search
        const response = await chatApi.sendMessage({
          message: inputMessage,
          searchWeb: enableWebSearch,
          model: selectedModel,
          systemPrompt: systemPrompt,
          conversationHistory: messages,
          debug: debugMode, // Pass debug flag
        });

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          searchResults: response.searchResults,
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        setIsThinking(false);
        setIsEvaluating(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      setIsLoading(false);
      setIsThinking(false);
      setIsEvaluating(false);
      setCurrentStreamingMessage('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentStreamingMessage('');
    setIsThinking(false);
    setIsEvaluating(false);
    setSearchDecision(null);
    setError(null);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    // Check if the message contains think tags
    const hasThinkTags = message.content.includes('<think>') && message.content.includes('</think>');
    
    if (hasThinkTags) {
      // Extract think content and actual response
      const thinkMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
      const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';
      const actualResponse = message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      
      return (
        <Box
          key={index}
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            mb: 2,
          }}
        >
          <Paper
            sx={{
              p: 2,
              maxWidth: '70%',
              backgroundColor: 'background.paper',
              color: 'text.primary',
            }}
          >
            {/* Think Section - Collapsible and Less Prominent */}
            {thinkContent && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ 
                    fontWeight: 'bold', 
                    color: 'text.secondary',
                    opacity: 0.8,
                    fontSize: '0.7rem'
                  }}>
                    AI Thinking Process
                  </Typography>
                  <Chip 
                    label={collapsedThinkSections.has(index) ? "Show" : "Hide"} 
                    size="small" 
                    variant="outlined" 
                    onClick={() => {
                      const newCollapsed = new Set(collapsedThinkSections);
                      if (newCollapsed.has(index)) {
                        newCollapsed.delete(index);
                      } else {
                        newCollapsed.add(index);
                      }
                      setCollapsedThinkSections(newCollapsed);
                    }}
                    sx={{ 
                      height: 18, 
                      fontSize: '0.65rem', 
                      opacity: 0.6,
                      borderColor: 'rgba(0,0,0,0.2)',
                      color: 'text.secondary',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8
                      }
                    }} 
                  />
                </Box>
                <Collapse in={!collapsedThinkSections.has(index)} timeout={300}>
                  <Paper sx={{ 
                    p: 1.5, 
                    backgroundColor: 'rgba(245, 245, 245, 0.6)', 
                    border: '1px dashed #d0d0d0',
                    opacity: 0.7,
                    mb: 1.5
                  }}>
                    <Typography variant="body2" sx={{ 
                      whiteSpace: 'pre-wrap', 
                      fontStyle: 'italic',
                      opacity: 0.8,
                      fontSize: '0.8rem',
                      color: 'text.secondary'
                    }}>
                      {thinkContent}
                    </Typography>
                  </Paper>
                </Collapse>
              </Box>
            )}
            
            {/* Actual Response - More Prominent */}
            {actualResponse && (
              <Box>
                <Typography variant="body1" sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  fontWeight: 500
                }}>
                  {actualResponse}
                </Typography>
              </Box>
            )}
            
            {/* Search Results */}
            {message.searchResults && message.searchResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 1, opacity: 0.5 }} />
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Sources found:
                </Typography>
                {message.searchResults.map((result, idx) => (
                  <Card key={idx} sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {result.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                        {result.snippet}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                        Source: {result.source}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 1, pt: 0 }}>
                      <Link href={result.url} target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit' }}>
                        <Button size="small" startIcon={<WebIcon />}>
                          Visit Source
                        </Button>
                      </Link>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            )}
            
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
              {formatTimestamp(message.timestamp)}
            </Typography>
          </Paper>
        </Box>
      );
    }
    
    // Regular message rendering (no think tags)
    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
          mb: 2,
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: '70%',
            backgroundColor: message.role === 'user' ? 'primary.main' : 'background.paper',
            color: message.role === 'user' ? 'white' : 'text.primary',
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
          
          {message.searchResults && message.searchResults.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1, opacity: 0.5 }} />
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Sources found:
              </Typography>
              {message.searchResults.map((result, idx) => (
                <Card key={idx} sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {result.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                      {result.snippet}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                      Source: {result.source}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 1, pt: 0 }}>
                    <Link href={result.url} target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit' }}>
                      <Button size="small" startIcon={<WebIcon />}>
                        Visit Source
                      </Button>
                    </Link>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            {formatTimestamp(message.timestamp)}
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" component="h1">
            AI Chat Assistant
          </Typography>
          <Box>
            <IconButton onClick={() => setShowSettings(!showSettings)}>
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={clearChat} disabled={messages.length === 0}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {ollamaHealth === false && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Ollama service is not responding. Please check if Ollama is running.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {showSettings && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>AI Model</InputLabel>
                  <Select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    label="AI Model"
                  >
                    {availableModels.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableWebSearch}
                      onChange={(e) => setEnableWebSearch(e.target.checked)}
                      name="enableWebSearch"
                      color="primary"
                    />
                  }
                  label="Enable Smart Web Search"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="System Prompt (Optional)"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Customize the AI's behavior and role..."
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.map((message, index) => renderMessage(message, index))}
              
              {/* Search Decision Display - Only show in debug mode */}
              {debugMode && searchDecision && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                  <Paper sx={{ p: 2, maxWidth: '70%', backgroundColor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <InfoIcon color="primary" />
                      <Typography variant="subtitle2" color="primary">
                        AI Evaluation Complete
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Decision:</strong> {searchDecision.needsSearch ? 'Web search needed' : 'No web search needed'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Reason:</strong> {searchDecision.reason}
                    </Typography>
                    <Chip
                      label={searchDecision.needsSearch ? 'Searching Web' : 'Using Knowledge Base'}
                      color={searchDecision.needsSearch ? 'success' : 'info'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Box>
              )}

              {/* Evaluation Phase - Only show in debug mode */}
              {debugMode && isEvaluating && !searchDecision && !currentStreamingMessage && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                  <Paper sx={{ p: 2, maxWidth: '70%', backgroundColor: 'background.paper', opacity: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Evaluating if web search is needed...
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Thinking Phase - Show by default (not just in debug mode) */}
              {isThinking && !isEvaluating && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
                  <Paper sx={{ 
                    p: 1, 
                    maxWidth: '70%', 
                    backgroundColor: 'rgba(245, 245, 245, 0.8)', 
                    opacity: 0.5, 
                    border: '1px dashed #d0d0d0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      opacity: 0.7,
                      backgroundColor: 'rgba(240, 240, 240, 0.9)'
                    }
                  }}>
                    <Collapse in={true} timeout={200}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <CircularProgress size={12} sx={{ opacity: 0.6 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', opacity: 0.7, fontSize: '0.7rem' }}>
                          {currentStreamingMessage ? 'Generating response...' : 'AI thinking...'}
                        </Typography>
                        <Chip 
                          label="Processing" 
                          size="small" 
                          variant="outlined" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.65rem', 
                            opacity: 0.5,
                            borderColor: 'rgba(0,0,0,0.15)',
                            color: 'text.secondary',
                            backgroundColor: 'rgba(255,255,255,0.3)'
                          }} 
                        />
                      </Box>
                    </Collapse>
                  </Paper>
                </Box>
              )}

              {/* Streaming Response - Always show when streaming */}
              {currentStreamingMessage && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                  <Paper sx={{ 
                    p: 2.5, 
                    maxWidth: '70%', 
                    backgroundColor: 'background.paper', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                    border: '1px solid #e8e8e8',
                    animation: 'fadeInUp 0.4s ease-out',
                    '@keyframes fadeInUp': {
                      '0%': {
                        opacity: 0,
                        transform: 'translateY(10px)'
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateY(0)'
                      }
                    }
                  }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                      {currentStreamingMessage}
                      {isLoading && <CircularProgress size={16} sx={{ ml: 1, opacity: 0.8 }} />}
                    </Typography>
                  </Paper>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    console.log('Test button clicked');
                    console.log('Current states:', { isLoading, isThinking, isEvaluating, currentStreamingMessage: currentStreamingMessage.length });
                    setCurrentStreamingMessage('Test streaming message');
                  }}
                  size="small"
                >
                  Test Streaming
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  multiline
                  maxRows={4}
                  disabled={isLoading}
                />
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  <SendIcon />
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon />
              Smart Web Search
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Chip
                label={enableWebSearch ? 'Enabled' : 'Disabled'}
                color={enableWebSearch ? 'success' : 'default'}
                icon={enableWebSearch ? <SearchIcon /> : undefined}
              />
              {/* Debug indicators - only show when debug mode is on */}
              {debugMode && isEvaluating && enableWebSearch && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    Evaluating question...
                  </Typography>
                </Box>
              )}
              {debugMode && isThinking && !isEvaluating && enableWebSearch && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    {searchDecision?.needsSearch ? 'Searching web...' : 'Thinking...'}
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              When enabled, the AI will first evaluate if your question needs current information before deciding to search the web. This saves time and resources by only searching when necessary.
            </Typography>

            {/* Debug information - only show when debug mode is on */}
            {debugMode && searchDecision && (
              <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Last Evaluation:
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {searchDecision.needsSearch ? 'Web search was performed' : 'Answered from knowledge base'}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  {searchDecision.reason}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Current Model: {selectedModel}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Using {availableModels.length} available model(s)
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={loadModels}
              startIcon={<RefreshIcon />}
              fullWidth
              sx={{ mb: 1 }}
            >
              Refresh Models
            </Button>

            <Button
              variant="outlined"
              onClick={checkHealth}
              startIcon={<RefreshIcon />}
              fullWidth
            >
              Check Health
            </Button>

            {/* Debug Mode Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  name="debugMode"
                  color="secondary"
                />
              }
              label="Debug Mode"
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Chat;
