import { Router } from 'express';
import { previewCover, previewThumbnail, previewVideo } from '../controllers/mediaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/videos/:filename', previewVideo);
router.get('/thumbs/:filename', previewThumbnail);
router.get('/covers/:filename', previewCover);

export default router;
