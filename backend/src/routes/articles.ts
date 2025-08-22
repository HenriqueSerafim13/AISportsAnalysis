import { Router, Request, Response } from 'express';
import ArticleRepository from '../repositories/ArticleRepository';
import { ApiResponse } from '../types';

const router = Router();

// GET /api/articles - List articles with pagination and search
router.get('/', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const feedId = req.query.feedId ? parseInt(req.query.feedId as string) : undefined;
    
    let articles;
    let total;
    
    if (search) {
      articles = await ArticleRepository.search(search, limit, offset);
      total = await ArticleRepository.getSearchCount(search);
    } else if (feedId) {
      articles = await ArticleRepository.findByFeedId(feedId, limit, offset);
      total = await ArticleRepository.getCountByFeedId(feedId);
    } else {
      articles = await ArticleRepository.findAll(limit, offset);
      total = await ArticleRepository.getCount();
    }
    
    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles'
    });
  }
});

// GET /api/articles/recent - Get recent articles
router.get('/recent', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const articles = await ArticleRepository.getRecentArticles(days);
    
    res.json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Failed to fetch recent articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent articles'
    });
  }
});

// GET /api/articles/:id - Get a specific article
router.get('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid article ID'
      });
    }
    
    const article = await ArticleRepository.findById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Failed to fetch article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article'
    });
  }
});

// DELETE /api/articles/bulk - Bulk delete articles
router.delete('/bulk', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { ids, feedId, olderThan, search } = req.body;
    
    let deletedCount = 0;
    
    if (ids && Array.isArray(ids)) {
      // Delete specific articles by IDs
      deletedCount = await ArticleRepository.deleteMany(ids);
    } else if (feedId) {
      // Delete all articles from a specific feed
      deletedCount = await ArticleRepository.deleteByFeedId(feedId);
    } else if (olderThan) {
      // Delete articles older than specified days
      const days = parseInt(olderThan);
      if (isNaN(days)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid olderThan parameter'
        });
      }
      deletedCount = await ArticleRepository.deleteOlderThan(days);
    } else if (search) {
      // Delete articles matching search term
      deletedCount = await ArticleRepository.deleteBySearch(search);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: ids, feedId, olderThan, or search'
      });
    }
    
    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} articles`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Failed to bulk delete articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete articles'
    });
  }
});

// DELETE /api/articles/:id - Delete an article
router.delete('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid article ID'
      });
    }
    
    const article = await ArticleRepository.findById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    const deleted = await ArticleRepository.delete(articleId);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete article'
      });
    }
    
    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete article'
    });
  }
});

// GET /api/articles/stats - Get article statistics
router.get('/stats/overview', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const total = await ArticleRepository.getCount();
    const recent = await ArticleRepository.getRecentArticles(7);
    
    res.json({
      success: true,
      data: {
        total,
        recent: recent.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to fetch article stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article stats'
    });
  }
});

export default router;
