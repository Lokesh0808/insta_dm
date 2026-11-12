import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/overview', analyticsController.overview);
router.get('/dms', analyticsController.dms);
router.get('/leads', analyticsController.leads);
router.get('/usage', analyticsController.usage);

export default router;
