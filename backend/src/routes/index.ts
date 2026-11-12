import { Router } from 'express';
import authRoutes from './auth.routes';
import instagramRoutes from './instagram.routes';
import automationRoutes from './automation.routes';
import leadRoutes from './lead.routes';
import conversationRoutes from './conversation.routes';
import analyticsRoutes from './analytics.routes';
import billingRoutes from './billing.routes';
import linkInBioRoutes from './linkInBio.routes';
import adminRoutes from './admin.routes';
import webhookRoutes from './webhook.routes';
import publicRoutes from './public.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/instagram', instagramRoutes);
router.use('/automations', automationRoutes);
router.use('/leads', leadRoutes);
router.use('/conversations', conversationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/billing', billingRoutes);
router.use('/link-in-bio', linkInBioRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/', publicRoutes);

export default router;
