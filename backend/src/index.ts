import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { Request, Response } from 'express';

// Load environment variables
dotenv.config();

// Import services and repositories
import DatabaseManager from './database';
import FeedRepository from './repositories/FeedRepository';
import ArticleRepository from './repositories/ArticleRepository';
import RSSService from './services/rss';
import AnalysisService from './services/AnalysisService';
import JobManager from './services/JobManager';
import ollamaService from './services/ollama';

// Import routes
import feedRoutes from './routes/feeds';
import articleRoutes from './routes/articles';
import analysisRoutes from './routes/analysis';
import jobRoutes from './routes/jobs';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const ollamaHealth = await ollamaService.checkHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        ollama: ollamaHealth ? 'ok' : 'error'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// SSE endpoint for real-time updates
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', data: { timestamp: new Date().toISOString() } })}\n\n`);

  // Add client to JobManager
  JobManager.addClient(res);

  // Handle client disconnect
  req.on('close', () => {
    JobManager.removeClient(res);
  });
});

// API routes
app.use('/api/feeds', feedRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/chat', chatRoutes);

// Background RSS fetching job
async function fetchAllFeeds() {
  try {
    console.log('Starting scheduled RSS fetch...');
    const jobId = await JobManager.createJob('rss_fetch', { allFeeds: true });
    
    // Process the job immediately
    await JobManager.processJob(jobId);
  } catch (error) {
    console.error('Scheduled RSS fetch failed:', error);
  }
}

// Schedule RSS fetching (default: every 2 hours instead of 30 minutes)
const rssInterval = process.env.RSS_FETCH_INTERVAL || '0 */2 * * *'; // Every 2 hours
cron.schedule(rssInterval, fetchAllFeeds);

// Cleanup old jobs daily
cron.schedule('0 2 * * *', () => {
  JobManager.cleanupOldJobs(7);
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    DatabaseManager.getInstance();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Sports Analysis Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 SSE endpoint: http://localhost:${PORT}/api/events`);
      console.log(`🤖 Ollama URL: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
    });
    
    // Initial RSS fetch
    setTimeout(fetchAllFeeds, 5000);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  DatabaseManager.getInstance().close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  DatabaseManager.getInstance().close();
  process.exit(0);
});
