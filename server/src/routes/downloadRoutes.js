import { Router } from 'express';
import { downloadVideo } from '../controllers/downloadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/:filename', protect, downloadVideo);

export default router;
