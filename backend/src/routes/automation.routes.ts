import { Router } from 'express';
import * as automationController from '../controllers/automation.controller';
import { authenticate, requireWorkspaceRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createAutomationSchema,
  listAutomationsSchema,
  toggleAutomationSchema,
  updateAutomationSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate(listAutomationsSchema, 'query'), automationController.list);
router.post('/', requireWorkspaceRole('owner', 'admin', 'member'), validate(createAutomationSchema), automationController.create);
router.get('/executions', automationController.listExecutions);
router.get('/:id', automationController.get);
router.put('/:id', requireWorkspaceRole('owner', 'admin', 'member'), validate(updateAutomationSchema), automationController.update);
router.patch('/:id/toggle', validate(toggleAutomationSchema), automationController.toggle);
router.delete('/:id', requireWorkspaceRole('owner', 'admin'), automationController.remove);
router.post('/:id/duplicate', automationController.duplicate);
router.get('/:id/executions', automationController.listExecutions);
router.post('/:id/test', automationController.testAutomation);

export default router;
