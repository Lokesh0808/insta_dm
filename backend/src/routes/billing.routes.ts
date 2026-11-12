import { Router } from 'express';
import * as billingController from '../controllers/billing.controller';
import { authenticate, requireWorkspaceRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema, verifyPaymentSchema } from '../validators/schemas';

const router = Router();

router.get('/plans', billingController.plans);
router.post('/webhook', billingController.webhookHandler);

router.use(authenticate);

router.post('/create-order', validate(createOrderSchema), billingController.createOrderHandler);
router.post('/verify-payment', validate(verifyPaymentSchema), billingController.verifyPaymentHandler);
router.get('/subscription', billingController.subscription);
router.get('/history', billingController.history);
router.post('/cancel', billingController.cancel);
router.post('/downgrade', requireWorkspaceRole('owner', 'admin'), billingController.downgrade);
router.post('/quote', billingController.quote);
router.post('/activate-manually', requireWorkspaceRole('owner', 'admin'), billingController.activateManually);

export default router;
