import { Router } from 'express';
import { generateMetadata, getAuthUrl, oauthCallback, refreshYoutubeStatus, status, upload } from '../controllers/youtubeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/callback', oauthCallback);
router.use(protect);
router.get('/auth-url', getAuthUrl);
router.get('/status', status);
router.post('/status/:projectId', refreshYoutubeStatus);
router.post('/metadata/:projectId', generateMetadata);
router.post('/upload/:projectId', upload);

export default router;
