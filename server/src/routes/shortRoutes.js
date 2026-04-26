import { Router } from 'express';
import { createShort, deleteShort, getShort, listShorts } from '../controllers/shortController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.post('/create', createShort);
router.get('/', listShorts);
router.get('/:id', getShort);
router.delete('/:id', deleteShort);

export default router;
