import mongoose from 'mongoose';
import { User } from '../models/User';
import { Workspace } from '../models/Workspace';
import { Subscription } from '../models/Subscription';
import { hashPassword } from '../utils/password';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getPlan } from '../services/plan.service';

/**
 * Creates the platform super-admin on first boot so the admin panel is
 * always reachable. Idempotent — safe to run on every start.
 */
export const bootstrapAdmin = async (): Promise<void> => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;

  const existing = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    if (existing.platformRole !== 'superadmin') {
      existing.platformRole = 'superadmin';
      await existing.save();
    }
    return;
  }

  // The workspace references the owner, and the user references the workspace,
  // so we pre-allocate the user id and wire both documents together.
  const userId = new mongoose.Types.ObjectId();

  const workspace = await Workspace.create({
    name: 'Platform',
    slug: `platform-${Date.now().toString(36)}`,
    owner: userId,
    members: [],
    settings: { defaultTimezone: 'UTC' },
  });

  const user = await User.create({
    _id: userId,
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    platformRole: 'superadmin',
    workspace: workspace._id,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  });

  workspace.owner = user._id;
  workspace.members.push({ user: user._id, role: 'owner', joinedAt: new Date() });
  await workspace.save();

  await Subscription.create({
    workspace: workspace._id,
    plan: 'business',
    status: 'active',
    billingCycle: 'monthly',
    price: 0,
    currency: getPlan('business').currency,
    planSnapshot: {
      instagramAccounts: getPlan('business').instagramAccounts,
      activeAutomations: getPlan('business').activeAutomations,
      automationEventsPerMonth: getPlan('business').automationEventsPerMonth,
      features: getPlan('business').features,
    },
  });

  logger.info({ email: user.email }, 'platform admin bootstrapped');
};
