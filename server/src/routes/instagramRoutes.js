import { Router } from 'express';
import { generateCaption, generateCovers, getAuthUrl, oauthCallback, refreshInstagramStatus, selectCover, status, upload } from '../controllers/instagramController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/callback', oauthCallback);
router.use(protect);
router.get('/auth-url', getAuthUrl);
router.get('/status', status);
router.post('/status/:projectId', refreshInstagramStatus);
router.post('/metadata/:projectId', generateCaption);
router.post('/covers/generate/:projectId', generateCovers);
router.post('/covers/select/:projectId', selectCover);
router.post('/upload/:projectId', upload);

export default router;
