import { Router } from 'express';
import * as linkInBioController from '../controllers/linkInBio.controller';
import { authenticate, requireWorkspaceRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { linkInBioSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', linkInBioController.list);
router.post('/', requireWorkspaceRole('owner', 'admin', 'member'), validate(linkInBioSchema), linkInBioController.create);
router.get('/:id', linkInBioController.get);
router.put('/:id', validate(linkInBioSchema.partial()), linkInBioController.update);
router.delete('/:id', requireWorkspaceRole('owner', 'admin'), linkInBioController.remove);
router.get('/:id/analytics', linkInBioController.analytics);
router.post('/:id/publish', linkInBioController.publish);
router.post('/:id/unpublish', linkInBioController.unpublish);

export default router;
