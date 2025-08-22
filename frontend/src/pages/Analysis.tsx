import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as AnalysisIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { format } from 'date-fns';
import { articlesApi, analysisApi } from '../services/api';
import sseService from '../services/sse';
import { Article, SSEEvent } from '../types';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const Analysis: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: articles = [] } = useQuery<Article[]>('recentArticles', () => articlesApi.getRecent(20));

  const reasoningMutation = useMutation(analysisApi.runReasoning, {
    onSuccess: (jobId) => {
      console.log('Reasoning analysis started:', jobId);
    },
  });

  useEffect(() => {
    // Subscribe to SSE events
    const unsubscribe = sseService.subscribe('analysis.chunk', (event: SSEEvent) => {
      if (event.data.chunk) {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === 'ai' && lastMessage.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + event.data.chunk }
            ];
          }
          return prev;
        });
      }
      
      if (event.data.done) {
        setIsStreaming(false);
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === 'ai') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, isStreaming: false }
            ];
          }
          return prev;
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Add AI message placeholder
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsStreaming(true);

    try {
      // Start reasoning analysis
      await reasoningMutation.mutateAsync({
        prompt: input,
        contextArticleIds: selectedArticles.length > 0 ? selectedArticles : undefined,
      });
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsStreaming(false);
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          ...aiMessage,
          content: 'Sorry, I encountered an error. Please try again.',
          isStreaming: false,
        }
      ]);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const toggleArticleSelection = (articleId: number) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Analysis
      </Typography>

      <Grid container spacing={3}>
        {/* Chat Interface */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <AnalysisIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Start a conversation with the AI
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Ask questions about sports analysis, betting predictions, or team comparisons
                  </Typography>
                </Box>
              ) : (
                <List>
                  {messages.map((message) => (
                    <ListItem key={message.id} sx={{ display: 'block', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Paper
                          sx={{
                            p: 2,
                            maxWidth: '70%',
                            bgcolor: message.type === 'user' ? 'primary.main' : 'background.paper',
                            color: message.type === 'user' ? 'white' : 'text.primary',
                          }}
                        >
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                            {message.isStreaming && (
                              <Box component="span" sx={{ animation: 'blink 1s infinite' }}>
                                |
                              </Box>
                            )}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 1,
                              opacity: 0.7,
                            }}
                          >
                            {format(message.timestamp, 'HH:mm')}
                          </Typography>
                        </Paper>
                      </Box>
                    </ListItem>
                  ))}
                  <div ref={messagesEndRef} />
                </List>
              )}
            </Box>

            {/* Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Ask about sports analysis, betting predictions, team comparisons..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isStreaming}
                />
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isStreaming}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  <SendIcon />
                </Button>
              </Box>
              {isStreaming && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="textSecondary">
                    AI is thinking...
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Context Articles */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh', overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Context Articles
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Select articles to provide context for the AI analysis
              </Typography>
            </Box>
            
            <List>
              {articles.map((article) => (
                <ListItem
                  key={article.id}
                  button
                  selected={selectedArticles.includes(article.id!)}
                  onClick={() => toggleArticleSelection(article.id!)}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <ListItemText
                    primary={article.title}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          {article.feed_title} • {format(new Date(article.published_at || ''), 'MMM dd')}
                        </Typography>
                        <Typography variant="body2" noWrap>
                          {article.summary}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {reasoningMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to start analysis. Please try again.
        </Alert>
      )}

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
    </Box>
  );
};

export default Analysis;
