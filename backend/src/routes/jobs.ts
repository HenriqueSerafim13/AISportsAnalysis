import { Router, Request, Response } from 'express';
import JobManager from '../services/JobManager';
import { ApiResponse } from '../types';

const router = Router();

// GET /api/jobs/:id - Get job status
router.get('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const jobId = req.params.id;
    
    const job = await JobManager.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Failed to fetch job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
});

export default router;
