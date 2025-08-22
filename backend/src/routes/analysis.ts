import { Router, Request, Response } from 'express';
import { z } from 'zod';
import AnalysisService from '../services/AnalysisService';
import { ApiResponse } from '../types';

const router = Router();

// Validation schemas
const analyzeArticleSchema = z.object({
  articleId: z.number().int().positive()
});

const reasoningAnalysisSchema = z.object({
  prompt: z.string().min(1),
  contextArticleIds: z.array(z.number().int().positive()).optional()
});

// POST /api/analysis/article/:id - Analyze a specific article
router.post('/article/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid article ID'
      });
    }
    
    const jobId = await AnalysisService.analyzeArticle(articleId);
    
    res.json({
      success: true,
      data: { jobId },
      message: 'Article analysis started'
    });
  } catch (error) {
    console.error('Failed to start article analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start article analysis'
    });
  }
});

// POST /api/analysis/reasoning - Run reasoning analysis
router.post('/reasoning', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const validatedData = reasoningAnalysisSchema.parse(req.body);
    
    const jobId = await AnalysisService.runReasoningAnalysis(
      validatedData.prompt,
      validatedData.contextArticleIds
    );
    
    res.json({
      success: true,
      data: { jobId },
      message: 'Reasoning analysis started'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Failed to start reasoning analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start reasoning analysis'
    });
  }
});

// POST /api/analysis/reasoning/stream - Stream reasoning analysis
router.post('/reasoning/stream', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const validatedData = reasoningAnalysisSchema.parse(req.body);
    
    // Set up SSE response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    const jobId = await AnalysisService.runReasoningAnalysis(
      validatedData.prompt,
      validatedData.contextArticleIds,
      (chunk: string, done: boolean) => {
        const event = {
          type: 'analysis.chunk',
          data: { chunk, done, jobId }
        };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        
        if (done) {
          res.end();
        }
      }
    );
    
    // Send initial job created event
    const event = {
      type: 'analysis.started',
      data: { jobId }
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Failed to start streaming reasoning analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start streaming reasoning analysis'
    });
  }
});

export default router;
