import { Router } from 'express';
import { previewThumbnail, previewVideo } from '../controllers/mediaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/videos/:filename', protect, previewVideo);
router.get('/thumbs/:filename', protect, previewThumbnail);

export default router;
