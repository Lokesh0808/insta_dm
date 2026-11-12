import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../validators/schemas';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', authenticate, authController.resendVerification);

router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/sessions', authenticate, authController.listSessions);
router.delete('/sessions/:id', authenticate, authController.revokeSession);

router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

export default router;
