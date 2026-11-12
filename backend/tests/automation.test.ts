import mongoose from 'mongoose';
import {
  matchesKeyword,
  normalise,
  renderTemplate,
  extractTemplateVariables,
  triggerTypeToAutomationType,
} from '../src/services/automation.service';
import { findMatchingAutomation } from '../src/services/automation.service';
import { Automation } from '../src/models/Automation';
import { startTestDatabase, stopTestDatabase, clearDatabase } from './helpers';

describe('Automation rule engine', () => {
  describe('matchesKeyword', () => {
    it('matches EXACT keywords only when the whole message equals the keyword', () => {
      expect(matchesKeyword('PRICE', 'price', 'EXACT')).toBe(true);
      expect(matchesKeyword('What is the PRICE?', 'price', 'EXACT')).toBe(false);
    });

    it('matches CONTAINS anywhere in the message', () => {
      expect(matchesKeyword('priceless things', 'price', 'CONTAINS')).toBe(true);
    });

    it('matches PARTIAL keywords on a word boundary', () => {
      expect(matchesKeyword('What is the price?', 'price', 'PARTIAL')).toBe(true);
      expect(matchesKeyword('priceless things', 'price', 'PARTIAL')).toBe(false);
    });

    it('matches STARTS_WITH', () => {
      expect(matchesKeyword('price list attached', 'price', 'STARTS_WITH')).toBe(true);
      expect(matchesKeyword('what is the price', 'price', 'STARTS_WITH')).toBe(false);
    });

    it('matches REGEX patterns', () => {
      expect(matchesKeyword('order 12345', '\\d{5}', 'REGEX')).toBe(true);
      expect(matchesKeyword('no digits', '\\d{5}', 'REGEX')).toBe(false);
    });

    it('respects case sensitivity', () => {
      expect(matchesKeyword('PRICE', 'price', 'EXACT', false)).toBe(true);
      expect(matchesKeyword('PRICE', 'price', 'EXACT', true)).toBe(false);
    });

    it('never matches an empty keyword', () => {
      expect(matchesKeyword('hello', '', 'PARTIAL')).toBe(false);
    });
  });

  describe('normalise', () => {
    it('lowercases and collapses whitespace', () => {
      expect(normalise('  Hello   WORLD ')).toBe('hello world');
    });
  });

  describe('renderTemplate', () => {
    it('substitutes placeholders', () => {
      expect(renderTemplate('Hi {{username}}, thanks for "{{keyword}}"!', {
        username: 'ada',
        keyword: 'PRICE',
      })).toBe('Hi ada, thanks for "PRICE"!');
    });

    it('replaces unknown placeholders with an empty string', () => {
      expect(renderTemplate('Hi {{unknown}}', {})).toBe('Hi ');
    });
  });

  describe('extractTemplateVariables', () => {
    it('lists every unique variable', () => {
      expect(
        extractTemplateVariables('{{username}} {{ keyword }} {{username}}'),
      ).toEqual(['username', 'keyword']);
    });
  });

  describe('triggerTypeToAutomationType', () => {
    it('maps trigger types to automation types', () => {
      expect(triggerTypeToAutomationType('KEYWORD')).toBe('KEYWORD_DM');
      expect(triggerTypeToAutomationType('COMMENT')).toBe('COMMENT_DM');
      expect(triggerTypeToAutomationType('STORY_REPLY')).toBe('STORY_REPLY');
    });
  });

  describe('findMatchingAutomation', () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const instagramAccountId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
      await startTestDatabase();
    }, 120000);

    afterAll(async () => {
      await stopTestDatabase();
    });

    beforeEach(async () => {
      await clearDatabase();
    });

    it('returns no match when there are no automations', async () => {
      const result = await findMatchingAutomation({
        workspaceId: workspaceId.toString(),
        instagramAccountId: instagramAccountId.toString(),
        text: 'hello',
        triggerType: 'KEYWORD',
      });
      expect(result.matched).toBe(false);
    });

    it('matches the automation whose keyword matches', async () => {
      await Automation.create({
        workspace: workspaceId,
        instagramAccount: instagramAccountId,
        createdBy: workspaceId,
        name: 'Pricing reply',
        type: 'KEYWORD_DM',
        isActive: true,
        priority: 0,
        message: 'Here is our pricing link',
        triggers: [
          {
            type: 'KEYWORD',
            enabled: true,
            keywords: ['price', 'pricing'],
            matchType: 'PARTIAL',
            caseSensitive: false,
            mediaIds: [],
            storyIds: [],
            delaySeconds: 0,
          },
        ],
      });

      const result = await findMatchingAutomation({
        workspaceId: workspaceId.toString(),
        instagramAccountId: instagramAccountId.toString(),
        text: 'Hi, what is the price?',
        triggerType: 'KEYWORD',
      });

      expect(result.matched).toBe(true);
      expect(result.matchedKeyword).toBe('price');
    });

    it('honours priority ordering', async () => {
      await Automation.create([
        {
          workspace: workspaceId,
          instagramAccount: instagramAccountId,
          createdBy: workspaceId,
          name: 'Low priority',
          type: 'KEYWORD_DM',
          priority: 1,
          message: 'low',
          triggers: [
            {
              type: 'KEYWORD',
              enabled: true,
              keywords: ['price'],
              matchType: 'PARTIAL',
              caseSensitive: false,
              mediaIds: [],
              storyIds: [],
              delaySeconds: 0,
            },
          ],
        },
        {
          workspace: workspaceId,
          instagramAccount: instagramAccountId,
          createdBy: workspaceId,
          name: 'High priority',
          type: 'KEYWORD_DM',
          priority: 10,
          message: 'high',
          triggers: [
            {
              type: 'KEYWORD',
              enabled: true,
              keywords: ['price'],
              matchType: 'PARTIAL',
              caseSensitive: false,
              mediaIds: [],
              storyIds: [],
              delaySeconds: 0,
            },
          ],
        },
      ]);

      const result = await findMatchingAutomation({
        workspaceId: workspaceId.toString(),
        instagramAccountId: instagramAccountId.toString(),
        text: 'price please',
        triggerType: 'KEYWORD',
      });

      expect(result.matched).toBe(true);
      expect(result.matchedRule).toContain('High priority');
    });

    it('ignores disabled automations and disabled triggers', async () => {
      await Automation.create({
        workspace: workspaceId,
        instagramAccount: instagramAccountId,
        createdBy: workspaceId,
        name: 'Disabled',
        type: 'KEYWORD_DM',
        isActive: false,
        message: 'x',
        triggers: [
          {
            type: 'KEYWORD',
            enabled: true,
            keywords: ['price'],
            matchType: 'PARTIAL',
            caseSensitive: false,
            mediaIds: [],
            storyIds: [],
            delaySeconds: 0,
          },
        ],
      });

      const result = await findMatchingAutomation({
        workspaceId: workspaceId.toString(),
        instagramAccountId: instagramAccountId.toString(),
        text: 'price',
        triggerType: 'KEYWORD',
      });

      expect(result.matched).toBe(false);
    });
  });
});
