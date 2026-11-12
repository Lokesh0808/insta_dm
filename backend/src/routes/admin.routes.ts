import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate, requirePlatformRole } from '../middleware/auth';

const router = Router();

router.use(authenticate, requirePlatformRole('admin', 'superadmin'));

router.get('/overview', adminController.overview);
router.get('/users', adminController.listUsers);
router.patch('/users/:id', adminController.updateUser);
router.get('/subscriptions', adminController.listSubscriptions);
router.get('/payments', adminController.listPayments);
router.get('/workspaces', adminController.listWorkspaces);
router.get('/usage', adminController.usageMonitor);
router.get('/health', adminController.systemHealth);

export default router;
