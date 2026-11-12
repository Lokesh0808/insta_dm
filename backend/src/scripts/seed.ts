/**
 * Seeds the database with a demo workspace so the dashboard can be explored
 * immediately after `docker compose up`.
 *
 *   npm run seed              # seed demo data
 *   npm run seed -- --reset   # wipe the demo data first
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { Workspace } from '../models/Workspace';
import { Subscription } from '../models/Subscription';
import { InstagramAccount } from '../models/InstagramAccount';
import { InstagramToken } from '../models/InstagramToken';
import { Automation } from '../models/Automation';
import { AutomationExecution } from '../models/AutomationExecution';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Lead } from '../models/Lead';
import { LinkInBio } from '../models/LinkInBio';
import { Usage } from '../models/Usage';
import { hashPassword } from '../utils/password';
import { encrypt } from '../utils/crypto';
import { getPlan } from '../services/plan.service';

const DEMO_EMAIL = 'demo@instaflow.local';
const DEMO_PASSWORD = 'Demo@12345';

const dayKey = (daysAgo: number): string => {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};

const seed = async (): Promise<void> => {
  await connectDatabase(env.MONGODB_URI);
  logger.info('connected to mongodb');

  if (process.argv.includes('--reset')) {
    await Promise.all([
      User.deleteMany({ email: DEMO_EMAIL }),
      Workspace.deleteMany({ slug: 'acme-studio' }),
      InstagramAccount.deleteMany({ username: 'acme.studio' }),
      Automation.deleteMany({ name: /Demo/ }),
    ]);
    logger.info('reset demo data');
  }

  let user = await User.findOne({ email: DEMO_EMAIL });
  let workspace = await Workspace.findOne({ slug: 'acme-studio' });

  if (!user) {
    // The workspace references the owner and the user references the workspace,
    // so the user id is allocated up front.
    const userId = new mongoose.Types.ObjectId();

    if (!workspace) {
      workspace = await Workspace.create({
        name: 'Acme Studio',
        slug: 'acme-studio',
        owner: userId,
        members: [{ user: userId, role: 'owner', joinedAt: new Date() }],
        settings: {
          defaultTimezone: 'UTC',
          fallbackMessage: 'Thanks for reaching out! We will get back to you shortly.',
          leadNotifications: true,
          brandColor: '#6366f1',
        },
      });
    }

    user = await User.create({
      _id: userId,
      name: 'Demo Owner',
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      platformRole: 'user',
      workspace: workspace._id,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      onboardingCompleted: true,
    });
  }

  if (!workspace) {
    workspace = await Workspace.create({
      name: 'Acme Studio',
      slug: 'acme-studio',
      owner: user._id,
      members: [{ user: user._id, role: 'owner', joinedAt: new Date() }],
      settings: {
        defaultTimezone: 'UTC',
        fallbackMessage: 'Thanks for reaching out! We will get back to you shortly.',
        leadNotifications: true,
        brandColor: '#6366f1',
      },
    });
  }

  if (!user.workspace) {
    user.workspace = workspace._id;
    await user.save();
  }

  // --- Subscription -------------------------------------------------------
  await Subscription.findOneAndUpdate(
    { workspace: workspace._id },
    {
      $set: {
        plan: 'growth',
        status: 'active',
        billingCycle: 'monthly',
        price: getPlan('growth').priceMonthly,
        currency: 'INR',
        planSnapshot: {
          instagramAccounts: getPlan('growth').instagramAccounts,
          activeAutomations: getPlan('growth').activeAutomations,
          automationEventsPerMonth: getPlan('growth').automationEventsPerMonth,
          features: getPlan('growth').features,
        },
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usagePeriodStart: new Date(),
        usagePeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true },
  );

  // --- Instagram accounts -------------------------------------------------
  const accounts = [
    { igUserId: '17841400000000001', username: 'acme.studio', name: 'Acme Studio', followers: 18400 },
    { igUserId: '17841400000000002', username: 'acme.shop', name: 'Acme Shop', followers: 5230 },
  ];

  for (const account of accounts) {
    const instagramAccount = await InstagramAccount.findOneAndUpdate(
      { workspace: workspace._id, igUserId: account.igUserId },
      {
        $set: {
          connectedBy: user._id,
          username: account.username,
          name: account.name,
          followersCount: account.followers,
          followsCount: 312,
          mediaCount: 148,
          accountType: 'BUSINESS',
          connectionStatus: 'connected',
          lastSyncedAt: new Date(),
        },
        $setOnInsert: { workspace: workspace._id, connectedAt: new Date() },
      },
      { upsert: true, new: true },
    );

    await InstagramToken.findOneAndUpdate(
      { instagramAccount: instagramAccount._id },
      {
        $set: {
          workspace: workspace._id,
          accessTokenEncrypted: encrypt(`demo-token-${account.igUserId}`),
          tokenType: 'page',
          isValid: true,
          scopes: ['instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments'],
          lastRefreshedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  const primary = await InstagramAccount.findOne({
    workspace: workspace._id,
    igUserId: accounts[0].igUserId,
  });

  // --- Automations --------------------------------------------------------
  const automations = [
    {
      name: 'Demo — Pricing keyword reply',
      type: 'KEYWORD_DM',
      description: 'Replies with the pricing page whenever someone asks about price.',
      priority: 10,
      triggers: [
        {
          type: 'KEYWORD',
          enabled: true,
          keywords: ['price', 'pricing', 'cost'],
          matchType: 'PARTIAL',
          caseSensitive: false,
          mediaIds: [],
          storyIds: [],
          delaySeconds: 3,
        },
      ],
      message: 'Thanks for your interest, {{username}}! Here is our pricing page: https://example.com/pricing',
    },
    {
      name: 'Demo — Comment to DM',
      type: 'COMMENT_DM',
      description: 'Sends the link when someone comments LINK on a post.',
      priority: 5,
      triggers: [
        {
          type: 'COMMENT',
          enabled: true,
          keywords: ['LINK', 'link'],
          matchType: 'PARTIAL',
          caseSensitive: false,
          mediaIds: [],
          storyIds: [],
          delaySeconds: 5,
        },
      ],
      message: 'Thanks for commenting! Here is the link you asked for 🙌',
    },
    {
      name: 'Demo — Story reply',
      type: 'STORY_REPLY',
      description: 'Welcomes people who reply to a story.',
      priority: 1,
      triggers: [
        {
          type: 'STORY_REPLY',
          enabled: true,
          keywords: ['interested', 'info'],
          matchType: 'PARTIAL',
          caseSensitive: false,
          mediaIds: [],
          storyIds: [],
          delaySeconds: 4,
        },
      ],
      message: 'Great that you reached out! Here is the full catalogue.',
    },
  ];

  const createdAutomations = [];
  for (const automation of automations) {
    const created = await Automation.findOneAndUpdate(
      { workspace: workspace._id, name: automation.name },
      {
        $set: {
          instagramAccount: primary!._id,
          createdBy: user._id,
          description: automation.description,
          type: automation.type,
          isActive: true,
          priority: automation.priority,
          triggers: automation.triggers,
          message: automation.message,
          collectLead: automation.type !== 'STORY_REPLY',
          leadTags: automation.type === 'KEYWORD_DM' ? ['price-inquiry'] : [],
          fallbackMessage: 'Thanks for your message! How can we help?',
        },
        $setOnInsert: { workspace: workspace._id },
      },
      { upsert: true, new: true },
    );
    createdAutomations.push(created);
  }

  // --- Conversations, messages, leads -------------------------------------
  const people = [
    { igUserId: '900000000000001', igUsername: 'maya_photos', name: 'Maya' },
    { igUserId: '900000000000002', igUsername: 'dev_arjun', name: 'Arjun' },
    { igUserId: '900000000000003', igUsername: 'nina.creates', name: 'Nina' },
    { igUserId: '900000000000004', igUsername: 'rahul_fitness', name: 'Rahul' },
    { igUserId: '900000000000005', igUsername: 'sara.designs', name: 'Sara' },
  ];

  for (let index = 0; index < people.length; index += 1) {
    const person = people[index];
    const conversation = await Conversation.findOneAndUpdate(
      { workspace: workspace._id, instagramAccount: primary!._id, igUserId: person.igUserId },
      {
        $set: {
          igUsername: person.igUsername,
          displayName: person.name,
          lastMessage: 'What is the price?',
          lastMessageAt: new Date(Date.now() - index * 3600 * 1000),
          lastMessageFrom: 'inbound',
          unreadCount: index === 0 ? 2 : 0,
          isAutomated: true,
          messagingWindowExpiresAt: new Date(Date.now() + 20 * 3600 * 1000),
          status: 'open',
          tags: index % 2 === 0 ? ['hot'] : [],
        },
        $setOnInsert: { workspace: workspace._id },
      },
      { upsert: true, new: true },
    );

    await Message.findOneAndUpdate(
      { workspace: workspace._id, externalId: `demo_in_${person.igUserId}` },
      {
        $set: {
          conversation: conversation._id,
          instagramAccount: primary!._id,
          direction: 'inbound',
          body: 'Hi! What is the price?',
          status: 'received',
          sentAt: new Date(Date.now() - (index + 1) * 3600 * 1000),
        },
        $setOnInsert: { workspace: workspace._id, externalId: `demo_in_${person.igUserId}` },
      },
      { upsert: true },
    );

    await Message.findOneAndUpdate(
      { workspace: workspace._id, externalId: `demo_out_${person.igUserId}` },
      {
        $set: {
          conversation: conversation._id,
          instagramAccount: primary!._id,
          direction: 'outbound',
          body: 'Thanks for your interest! Here is our pricing page: https://example.com/pricing',
          status: 'sent',
          automation: createdAutomations[0]._id,
          sentAt: new Date(Date.now() - (index + 1) * 3600 * 1000 + 5000),
        },
        $setOnInsert: { workspace: workspace._id, externalId: `demo_out_${person.igUserId}` },
      },
      { upsert: true },
    );

    await Lead.findOneAndUpdate(
      { workspace: workspace._id, igUserId: person.igUserId },
      {
        $set: {
          instagramAccount: primary!._id,
          igUsername: person.igUsername,
          name: person.name,
          email: index % 2 === 0 ? `${person.igUsername}@example.com` : undefined,
          source: 'keyword_dm',
          status: index === 0 ? 'converted' : index === 1 ? 'qualified' : 'new',
          tags: index % 2 === 0 ? ['hot', 'price-inquiry'] : ['price-inquiry'],
          automation: createdAutomations[0]._id,
          conversation: conversation._id,
          profileSnapshot: { followersCount: 1200 + index * 430 },
        },
        $setOnInsert: { workspace: workspace._id },
      },
      { upsert: true },
    );

    await AutomationExecution.findOneAndUpdate(
      { workspace: workspace._id, sourceId: `demo_exec_${person.igUserId}` },
      {
        $set: {
          automation: createdAutomations[0]._id,
          instagramAccount: primary!._id,
          triggerType: 'KEYWORD',
          triggerKeyword: 'price',
          igUserId: person.igUserId,
          igUsername: person.igUsername,
          status: 'success',
          step: 'completed',
          messageSent: 'Thanks for your interest! Here is our pricing page.',
          durationMs: 320 + index * 40,
          createdAt: new Date(Date.now() - (index + 1) * 3600 * 1000),
        },
        $setOnInsert: { workspace: workspace._id },
      },
      { upsert: true, new: true },
    );
  }

  // --- Usage counters -----------------------------------------------------
  const monthPeriod = new Date().toISOString().slice(0, 7);
  await Usage.updateOne(
    { workspace: workspace._id, metric: 'automation_events', period: monthPeriod },
    { $set: { count: 1842, limit: 25000, periodType: 'month' } },
    { upsert: true },
  );
  await Usage.updateOne(
    { workspace: workspace._id, metric: 'instagram_accounts', period: monthPeriod },
    { $set: { count: accounts.length, limit: 5, periodType: 'month' } },
    { upsert: true },
  );
  await Usage.updateOne(
    { workspace: workspace._id, metric: 'active_automations', period: monthPeriod },
    { $set: { count: createdAutomations.length, limit: 50, periodType: 'month' } },
    { upsert: true },
  );
  await Usage.updateOne(
    { workspace: workspace._id, metric: 'leads_created', period: monthPeriod },
    { $set: { count: people.length, limit: 0, periodType: 'month' } },
    { upsert: true },
  );
  await Usage.updateOne(
    { workspace: workspace._id, metric: 'messages_sent', period: monthPeriod },
    { $set: { count: people.length * 2, limit: 0, periodType: 'month' } },
    { upsert: true },
  );

  // --- Link-in-bio --------------------------------------------------------
  await LinkInBio.findOneAndUpdate(
    { workspace: workspace._id, slug: 'acmestudio' },
    {
      $set: {
        title: 'Acme Studio',
        bio: 'Handmade ceramics and small-batch goods. Link in bio for the full catalogue.',
        isPublished: true,
        publishedAt: new Date(),
        analytics: { views: 4820, clicks: 631, uniqueVisitors: 3900 },
        links: [
          {
            id: 'link_1',
            title: 'Shop the catalogue',
            url: 'https://example.com/shop',
            isActive: true,
            clicks: 412,
            order: 0,
          },
          {
            id: 'link_2',
            title: 'Book a workshop',
            url: 'https://example.com/workshops',
            isActive: true,
            clicks: 163,
            order: 1,
          },
          {
            id: 'link_3',
            title: 'Join the mailing list',
            url: 'https://example.com/newsletter',
            isActive: true,
            clicks: 56,
            order: 2,
          },
        ],
        socialLinks: [{ platform: 'instagram', url: 'https://instagram.com/acme.studio' }],
      },
      $setOnInsert: { workspace: workspace._id },
    },
    { upsert: true, new: true },
  );

  logger.info(
    {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      daysSeeded: 30,
      lastDay: dayKey(0),
    },
    'seed complete',
  );

  // eslint-disable-next-line no-console
  console.log('\n──────────────────────────────────────────────');
  // eslint-disable-next-line no-console
  console.log('  Demo workspace seeded');
  // eslint-disable-next-line no-console
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log('──────────────────────────────────────────────\n');

  await disconnectDatabase();
};

seed().catch(async (error) => {
  logger.error({ err: error.message }, 'seed failed');
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
