import { Router } from 'express';
import * as leadController from '../controllers/lead.controller';
import { authenticate, requireWorkspaceRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLeadSchema, listLeadsSchema, updateLeadSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate(listLeadsSchema, 'query'), leadController.list);
router.post('/', requireWorkspaceRole('owner', 'admin', 'member'), validate(createLeadSchema), leadController.create);
router.get('/tags', leadController.listTags);
router.get('/export', leadController.exportCsv);
router.get('/:id', leadController.get);
router.patch('/:id', validate(updateLeadSchema), leadController.update);
router.delete('/:id', requireWorkspaceRole('owner', 'admin'), leadController.remove);
router.post('/bulk-delete', requireWorkspaceRole('owner', 'admin'), leadController.bulkDelete);

export default router;
