import { Router } from 'express';
import * as instagramController from '../controllers/instagram.controller';
import { authenticate, requireWorkspaceRole } from '../middleware/auth';

const router = Router();

// The Meta OAuth callback is authenticated via the signed `state` parameter,
// so it must NOT use the standard authenticate middleware.
router.get('/connect', authenticate, instagramController.connect);
router.get('/callback', instagramController.callback);

router.get('/accounts', authenticate, instagramController.listAccounts);
router.get('/accounts/:id', authenticate, instagramController.getAccount);
router.patch('/accounts/:id', authenticate, requireWorkspaceRole('owner', 'admin'), instagramController.updateAccountSettings);
router.post('/accounts/:id/sync', authenticate, requireWorkspaceRole('owner', 'admin'), instagramController.syncAccount);
router.delete('/accounts/:id', authenticate, requireWorkspaceRole('owner', 'admin'), instagramController.removeAccount);

export default router;
