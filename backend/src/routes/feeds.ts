import { Router, Request, Response } from 'express';
import { z } from 'zod';
import FeedRepository from '../repositories/FeedRepository';
import RSSService from '../services/rss';
import { ApiResponse } from '../types';

const router = Router();

// Validation schemas
const createFeedSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true)
});

const updateFeedSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional()
});

// GET /api/feeds - List all feeds
router.get('/', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const feeds = await FeedRepository.findAll();
    res.json({
      success: true,
      data: feeds
    });
  } catch (error) {
    console.error('Failed to fetch feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feeds'
    });
  }
});

// POST /api/feeds - Create a new feed
router.post('/', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const validatedData = createFeedSchema.parse(req.body);
    
    // Check if feed already exists
    const existingFeed = await FeedRepository.findByUrl(validatedData.url);
    if (existingFeed) {
      return res.status(400).json({
        success: false,
        error: 'Feed with this URL already exists'
      });
    }
    
    // Validate RSS feed
    const isValid = await RSSService.validateFeed(validatedData.url);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RSS feed URL'
      });
    }
    
    const feedId = await FeedRepository.create(validatedData);
    const feed = await FeedRepository.findById(feedId);
    
    res.status(201).json({
      success: true,
      data: feed,
      message: 'Feed created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error'
      });
    }
    
    console.error('Failed to create feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create feed'
    });
  }
});

// GET /api/feeds/:id - Get a specific feed
router.get('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const feedId = parseInt(req.params.id);
    if (isNaN(feedId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feed ID'
      });
    }
    
    const feed = await FeedRepository.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }
    
    res.json({
      success: true,
      data: feed
    });
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feed'
    });
  }
});

// PUT /api/feeds/:id - Update a feed
router.put('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const feedId = parseInt(req.params.id);
    if (isNaN(feedId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feed ID'
      });
    }
    
    const validatedData = updateFeedSchema.parse(req.body);
    
    const feed = await FeedRepository.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }
    
    const updated = await FeedRepository.update(feedId, validatedData);
    if (!updated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update feed'
      });
    }
    
    const updatedFeed = await FeedRepository.findById(feedId);
    
    res.json({
      success: true,
      data: updatedFeed,
      message: 'Feed updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error'
      });
    }
    
    console.error('Failed to update feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feed'
    });
  }
});

// DELETE /api/feeds/:id - Delete a feed
router.delete('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const feedId = parseInt(req.params.id);
    if (isNaN(feedId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feed ID'
      });
    }
    
    const feed = await FeedRepository.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }
    
    const deleted = await FeedRepository.delete(feedId);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete feed'
      });
    }
    
    res.json({
      success: true,
      message: 'Feed deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete feed'
    });
  }
});

// POST /api/feeds/:id/fetch - Manually fetch a feed
router.post('/:id/fetch', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const feedId = parseInt(req.params.id);
    if (isNaN(feedId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feed ID'
      });
    }
    
    const feed = await FeedRepository.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }
    
    // Import JobManager here to avoid circular dependencies
    const JobManager = (await import('../services/JobManager')).default;
    const jobId = await JobManager.createJob('rss_fetch', { feedId });
    
    // Process the job immediately in the background
    JobManager.processJob(jobId).catch(error => {
      console.error(`Failed to process job ${jobId}:`, error);
    });
    
    res.json({
      success: true,
      message: 'Feed fetch initiated',
      data: { feedId, jobId }
    });
  } catch (error) {
    console.error('Failed to initiate feed fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate feed fetch'
    });
  }
});

// POST /api/feeds/fetch-all - Manually fetch all enabled feeds
router.post('/fetch-all', async (req: Request, res: Response<ApiResponse>) => {
  try {
    // Import JobManager here to avoid circular dependencies
    const JobManager = (await import('../services/JobManager')).default;
    const jobId = await JobManager.createJob('rss_fetch', { allFeeds: true });
    
    // Process the job immediately in the background
    JobManager.processJob(jobId).catch(error => {
      console.error(`Failed to process job ${jobId}:`, error);
    });
    
    res.json({
      success: true,
      message: 'All feeds fetch initiated',
      data: { jobId }
    });
  } catch (error) {
    console.error('Failed to initiate all feeds fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate all feeds fetch'
    });
  }
});

export default router;
