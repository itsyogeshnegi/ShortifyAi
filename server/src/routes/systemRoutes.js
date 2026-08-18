import express from 'express';
import { getLatestBugs, clearBugLogs } from '../utils/bugTracker.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/logs', protect, (_req, res) => {
  const logs = getLatestBugs();
  res.json({
    success: true,
    count: logs.length,
    logs
  });
});

router.delete('/logs', protect, (_req, res) => {
  clearBugLogs();
  res.json({
    success: true,
    message: 'Bug logs cleared successfully.'
  });
});

export default router;
