import { Router } from 'express';
import { generateCaption, getAuthUrl, oauthCallback, refreshInstagramStatus, status, upload } from '../controllers/instagramController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/callback', oauthCallback);
router.use(protect);
router.get('/auth-url', getAuthUrl);
router.get('/status', status);
router.post('/status/:projectId', refreshInstagramStatus);
router.post('/metadata/:projectId', generateCaption);
router.post('/upload/:projectId', upload);

export default router;
