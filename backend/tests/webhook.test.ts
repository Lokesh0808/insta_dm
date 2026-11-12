import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { InstagramAccount } from '../src/models/InstagramAccount';
import { WebhookEvent } from '../src/models/WebhookEvent';
import { Automation } from '../src/models/Automation';
import { startTestDatabase, stopTestDatabase, clearDatabase } from './helpers';

// The BullMQ broker is not available inside the test environment, so the queue
// is stubbed — the webhook logic itself is what we are verifying here.
jest.mock('../src/jobs/automation.queue', () => ({
  enqueueAutomationJob: jest.fn().mockResolvedValue('job_test'),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { enqueueAutomationJob } = require('../src/jobs/automation.queue');

const app = createApp();

describe('Instagram webhook API', () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const igUserId = '17841400000000001';

  beforeAll(async () => {
    await startTestDatabase();
  }, 120000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await InstagramAccount.create({
      workspace: workspaceId,
      connectedBy: workspaceId,
      igUserId,
      username: 'testbrand',
      name: 'Test Brand',
      accountType: 'BUSINESS',
      connectionStatus: 'connected',
    });
  });

  describe('GET /api/webhooks/instagram (verification)', () => {
    it('echoes the challenge when the verify token matches', async () => {
      const res = await request(app)
        .get('/api/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'instaflow_webhook_verify_token',
          'hub.challenge': '1158201444',
        })
        .expect(200);

      expect(res.text).toBe('1158201444');
    });

    it('rejects an incorrect verify token', async () => {
      await request(app)
        .get('/api/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': '1158201444',
        })
        .expect(403);
    });
  });

  describe('POST /api/webhooks/instagram', () => {
    it('accepts a messaging event and stores a webhook record', async () => {
      const res = await request(app)
        .post('/api/webhooks/instagram')
        .send({
          object: 'instagram',
          entry: [
            {
              id: igUserId,
              time: Date.now(),
              messaging: [
                {
                  sender: { id: '987654321' },
                  recipient: { id: igUserId },
                  timestamp: Date.now(),
                  message: { mid: 'm_abc123', text: 'What is the price?' },
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Give the async processing a moment to persist the event.
      await new Promise((resolve) => setTimeout(resolve, 400));
      const stored = await WebhookEvent.findOne({ externalId: 'ig_msg_m_abc123' });
      expect(stored).not.toBeNull();
      expect(stored!.eventType).toBe('messaging');
    });

    it('processes a comment event and creates an execution', async () => {
      const account = await InstagramAccount.findOne({ igUserId });
      await Automation.create({
        workspace: workspaceId,
        instagramAccount: account!._id,
        createdBy: workspaceId,
        name: 'Comment to DM',
        type: 'COMMENT_DM',
        isActive: true,
        message: 'Here is your link',
        triggers: [
          {
            type: 'COMMENT',
            enabled: true,
            keywords: ['LINK'],
            matchType: 'PARTIAL',
            caseSensitive: false,
            mediaIds: [],
            storyIds: [],
            delaySeconds: 0,
          },
        ],
      });

      await request(app)
        .post('/api/webhooks/instagram')
        .send({
          object: 'instagram',
          entry: [
            {
              id: igUserId,
              time: Date.now(),
              change: {
                field: 'comments',
                value: {
                  id: 'comment_123',
                  text: 'LINK please',
                  media: { id: 'media_123' },
                  from: { id: '555000111', username: 'commenter' },
                },
              },
            },
          ],
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 600));

      const stored = await WebhookEvent.findOne({ externalId: 'ig_comment_comment_123' });
      expect(stored).not.toBeNull();
      expect(stored!.status).toBe('processed');
      expect(enqueueAutomationJob).toHaveBeenCalled();
      expect(enqueueAutomationJob.mock.calls[0][0]).toMatchObject({
        triggerType: 'COMMENT',
        triggerKeyword: 'LINK',
        igUsername: 'commenter',
      });
    });

    it('ignores events for unknown Instagram accounts', async () => {
      await request(app)
        .post('/api/webhooks/instagram')
        .send({
          object: 'instagram',
          entry: [
            {
              id: '99999999999999999',
              messaging: [
                {
                  sender: { id: '1' },
                  message: { mid: 'm_unknown', text: 'hello' },
                },
              ],
            },
          ],
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 300));
      const stored = await WebhookEvent.findOne({ externalId: 'ig_msg_m_unknown' });
      expect(stored).toBeNull();
    });

    it('is idempotent for a repeated message id', async () => {
      const payload = {
        object: 'instagram',
        entry: [
          {
            id: igUserId,
            messaging: [
              {
                sender: { id: '987654321' },
                message: { mid: 'm_dup', text: 'hello' },
              },
            ],
          },
        ],
      };

      await request(app).post('/api/webhooks/instagram').send(payload).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await request(app).post('/api/webhooks/instagram').send(payload).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const count = await WebhookEvent.countDocuments({ externalId: 'ig_msg_m_dup' });
      expect(count).toBe(1);
    });
  });
});
