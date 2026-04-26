import { Router } from 'express';
import { generateScript, generateTopicIdeas } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/script', protect, generateScript);
router.post('/topics', protect, generateTopicIdeas);

export default router;
