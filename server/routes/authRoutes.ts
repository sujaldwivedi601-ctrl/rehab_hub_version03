import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Rate limiter for authentication endpoints: 10 attempts per minute per IP
const authLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 1000,
  message: 'Too many authentication attempts. Please wait 1 minute before retrying.',
});

router.post('/login', authLimiter, AuthController.login);
router.post('/register-doctor', authLimiter, AuthController.registerDoctor);
router.get('/me', authenticateToken, AuthController.getMe);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/change-password', authenticateToken, AuthController.changePassword);
router.post('/activate', authLimiter, AuthController.activateAccount);
router.post('/recover', authLimiter, AuthController.recoverAccount);

export default router;
