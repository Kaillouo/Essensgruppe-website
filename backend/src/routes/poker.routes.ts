import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { pokerPublicState } from '../socket/poker.socket';

const router = Router();

router.use(authenticateToken);

// GET /api/poker/state — current table snapshot (for page load)
router.get('/state', (_req, res) => {
  res.json(pokerPublicState());
});

export default router;
