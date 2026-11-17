import { Router } from 'express';
import { getCurrentUser, login, logout, register } from '../controllers/authController.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Terlalu banyak percobaan autentikasi. Coba lagi dalam beberapa menit.',
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getCurrentUser);

export default router;
