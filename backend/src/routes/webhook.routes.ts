import { Router } from 'express';
import { verify, receive } from '../webhooks/instagram.handler';
import { webhookLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * Meta webhook endpoints.
 * GET  — verification handshake (hub.mode / hub.verify_token / hub.challenge)
 * POST — event delivery for messaging, comments and follows
 */
router.get('/instagram', verify);
router.post('/instagram', webhookLimiter, receive);

export default router;
