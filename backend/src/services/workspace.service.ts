import mongoose from 'mongoose';
import { Workspace, type IWorkspace } from '../models/Workspace';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { getPlan } from './plan.service';
import { NotFoundError } from '../utils/errors';
import type { UserRole } from '../types/enums';

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'workspace';

export const uniqueSlug = async (base: string): Promise<string> => {
  const root = slugify(base);
  let slug = root;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Workspace.exists({ slug })) {
    slug = `${root}-${counter}`;
    counter += 1;
  }
  return slug;
};

/**
 * Resolves the role a user holds inside a workspace.
 * Falls back to `owner` for the workspace owner and `viewer` otherwise.
 */
export const workspaceMemberRoles = async (
  workspaceId: string,
  userId: string,
): Promise<{ role: UserRole; roles: UserRole[] }> => {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) return { role: 'viewer', roles: ['viewer'] };

  const ownerId = workspace.owner?.toString();
  if (ownerId === userId) return { role: 'owner', roles: ['owner', 'admin', 'member', 'viewer'] };

  const member = workspace.members?.find((m) => m.user?.toString() === userId);
  if (member) {
    return {
      role: member.role,
      roles: roleHierarchy[member.role],
    };
  }
  return { role: 'viewer', roles: ['viewer'] };
};

export const roleHierarchy: Record<UserRole, UserRole[]> = {
  owner: ['owner', 'admin', 'member', 'viewer'],
  admin: ['admin', 'member', 'viewer'],
  member: ['member', 'viewer'],
  viewer: ['viewer'],
};

/**
 * Tiny in-process cache for workspace membership lookups. Workspaces change
 * rarely, so a short TTL keeps the auth middleware cheap without hammering Mongo.
 */
const workspaceCache = new Map<string, { workspace: IWorkspace; cachedAt: number }>();
const CACHE_TTL_MS = 30_000;

export const invalidateWorkspaceCache = (workspaceId?: string): void => {
  if (workspaceId) workspaceCache.delete(workspaceId);
  else workspaceCache.clear();
};

export const getWorkspace = async (workspaceId: string): Promise<IWorkspace> => {
  const cached = workspaceCache.get(workspaceId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.workspace;

  const workspace = await Workspace.findById(workspaceId).lean<IWorkspace>();
  if (!workspace) throw new NotFoundError('Workspace not found');

  workspaceCache.set(workspaceId, { workspace, cachedAt: Date.now() });
  return workspace;
};

/**
 * Creates a workspace for a user.
 *
 * The owner id is passed in (rather than created here) because the user
 * document itself needs a workspace reference — the two are created in a
 * single transaction-like sequence by the caller.
 */
export const createWorkspace = async (opts: {
  name: string;
  ownerId: mongoose.Types.ObjectId;
}): Promise<IWorkspace> => {
  const slug = await uniqueSlug(opts.name);
  const workspace = await Workspace.create({
    name: opts.name,
    slug,
    owner: opts.ownerId,
    members: [{ user: opts.ownerId, role: 'owner', joinedAt: new Date() }],
  });

  // Every workspace starts on the free plan with its usage counters zeroed.
  await Subscription.create({
    workspace: workspace._id,
    plan: 'free',
    status: 'active',
    billingCycle: 'monthly',
    price: 0,
    currency: getPlan('free').currency,
    planSnapshot: {
      instagramAccounts: getPlan('free').instagramAccounts,
      activeAutomations: getPlan('free').activeAutomations,
      automationEventsPerMonth: getPlan('free').automationEventsPerMonth,
      features: getPlan('free').features,
    },
    usagePeriodStart: new Date(),
    usagePeriodEnd: nextMonth(),
  });

  invalidateWorkspaceCache(workspace._id.toString());
  return workspace;
};

export const nextMonth = (from = new Date()): Date => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  role: UserRole,
): Promise<void> => {
  await Workspace.updateOne(
    { _id: workspaceId, 'members.user': { $ne: userId } },
    { $push: { members: { user: userId, role, joinedAt: new Date() } } },
  );
  invalidateWorkspaceCache(workspaceId);
};
