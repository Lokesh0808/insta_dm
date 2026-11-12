import crypto from 'crypto';
import { LinkInBio, LinkInBioEvent, type ILinkInBio } from '../models/LinkInBio';
import { recordUsage } from './usage.service';
import { NotFoundError } from '../utils/errors';
import { env } from '../config/env';

export const DEFAULT_THEME = {
  template: 'gradient' as const,
  backgroundColor: '#0f172a',
  accentColor: '#6366f1',
  textColor: '#ffffff',
  buttonStyle: 'solid' as const,
  showInstagramProfile: true,
  fontFamily: 'Inter',
};

const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'dashboard',
  'login',
  'register',
  'pricing',
  'features',
  'privacy',
  'terms',
  'about',
  'blog',
  'settings',
  'billing',
  'assets',
  'uploads',
  'socket.io',
  'health',
  'webhooks',
  'static',
  'public',
  'www',
  'app',
]);

export const isReservedSlug = (slug: string): boolean => RESERVED_SLUGS.has(slug.toLowerCase());

export const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || `page${crypto.randomBytes(3).toString('hex')}`;

export const uniqueSlug = async (workspaceId: string, base: string): Promise<string> => {
  const root = generateSlug(base);
  let slug = root;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await LinkInBio.exists({ slug })) {
    slug = `${root}${counter}`;
    counter += 1;
  }
  return slug;
};

export const createLinkInBio = async (params: {
  workspaceId: string;
  title: string;
  slug?: string;
  bio?: string;
  instagramAccountId?: string;
}): Promise<ILinkInBio> => {
  const slug = params.slug ? generateSlug(params.slug) : await uniqueSlug(params.workspaceId, params.title);

  return LinkInBio.create({
    workspace: params.workspaceId,
    slug,
    title: params.title,
    bio: params.bio ?? '',
    theme: DEFAULT_THEME,
    links: [],
    socialLinks: [],
    instagramAccount: params.instagramAccountId,
    isPublished: false,
  });
};

export const getPublicPage = async (slug: string, customDomain?: string) => {
  const filter = customDomain
    ? { customDomain, isPublished: true }
    : { slug, isPublished: true };
  const page = await LinkInBio.findOne(filter).lean();
  if (!page) throw new NotFoundError('This page does not exist or is not published');
  return page;
};

export const recordView = async (params: {
  linkInBioId: string;
  workspaceId: string;
  visitorId: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
}): Promise<void> => {
  await LinkInBioEvent.create({
    workspace: params.workspaceId,
    linkInBio: params.linkInBioId,
    type: 'view',
    visitorId: params.visitorId,
    referrer: params.referrer,
    userAgent: params.userAgent,
    country: params.country,
  });

  await LinkInBio.updateOne({ _id: params.linkInBioId }, { $inc: { 'analytics.views': 1 } });
};

export const recordClick = async (params: {
  linkInBioId: string;
  workspaceId: string;
  linkId: string;
  visitorId: string;
  referrer?: string;
  userAgent?: string;
}): Promise<void> => {
  await LinkInBioEvent.create({
    workspace: params.workspaceId,
    linkInBio: params.linkInBioId,
    linkId: params.linkId,
    type: 'click',
    visitorId: params.visitorId,
    referrer: params.referrer,
    userAgent: params.userAgent,
  });

  await LinkInBio.updateOne(
    { _id: params.linkInBioId },
    { $inc: { 'analytics.clicks': 1, 'links.$[link].clicks': 1 } },
    { arrayFilters: [{ 'link.id': params.linkId }] },
  );

  await recordUsage(params.workspaceId, 'link_clicks');
};

export const getLinkInBioAnalytics = async (workspaceId: string, linkInBioId: string, days = 30) => {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await LinkInBioEvent.find({
    workspace: workspaceId,
    linkInBio: linkInBioId,
    createdAt: { $gte: from },
  })
    .select('type linkId visitorId createdAt referrer device')
    .lean();

  const daily = new Map<string, { views: number; clicks: number }>();
  const byLink = new Map<string, number>();
  const uniqueVisitors = new Set<string>();

  for (const event of events) {
    const key = new Date(event.createdAt).toISOString().slice(0, 10);
    const entry = daily.get(key) ?? { views: 0, clicks: 0 };
    if (event.type === 'view') entry.views += 1;
    else entry.clicks += 1;
    daily.set(key, entry);
    uniqueVisitors.add(event.visitorId);
    if (event.type === 'click' && event.linkId) {
      byLink.set(event.linkId, (byLink.get(event.linkId) ?? 0) + 1);
    }
  }

  const series = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, ...value }));

  return {
    series,
    uniqueVisitors: uniqueVisitors.size,
    totalViews: events.filter((e) => e.type === 'view').length,
    totalClicks: events.filter((e) => e.type === 'click').length,
    clicksByLink: [...byLink.entries()].map(([linkId, count]) => ({ linkId, count })),
  };
};

export const publicUrlFor = (slug: string, customDomain?: string): string =>
  customDomain
    ? `https://${customDomain}`
    : `${env.APP_BASE_URL.replace(/\/$/, '')}/p/${slug}`;
