import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listConversationsSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate(listConversationsSchema, 'query'), conversationController.list);
router.get('/:id', conversationController.get);
router.post('/:id/mark-read', conversationController.markRead);
router.post('/:id/reply', conversationController.sendReply);
router.patch('/:id', conversationController.updateStatus);

export default router;
