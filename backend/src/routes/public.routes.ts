import { Router } from 'express';
import * as linkInBioController from '../controllers/linkInBio.controller';
import * as billingController from '../controllers/billing.controller';

const router = Router();

/** Public pricing plans (no auth). */
router.get('/plans', billingController.plans);

/** Public link-in-bio page + click tracking (no auth). */
router.get('/p/:slug', linkInBioController.publicPage);
router.post('/p/:slug/click/:linkId', linkInBioController.trackClick);

export default router;
