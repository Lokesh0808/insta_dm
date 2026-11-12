import type { Request, Response } from 'express';
import { LinkInBio, LinkInBioEvent } from '../models/LinkInBio';
import {
  createLinkInBio,
  getLinkInBioAnalytics,
  isReservedSlug,
  publicUrlFor,
  uniqueSlug,
} from '../services/linkInBio.service';
import { asyncHandler } from '../utils/helpers';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { Subscription } from '../models/Subscription';
import { getPlan } from '../services/plan.service';
import { env } from '../config/env';

const toDTO = (page: any) => ({
  id: page._id.toString(),
  slug: page.slug,
  title: page.title,
  bio: page.bio,
  avatarUrl: page.avatarUrl,
  theme: page.theme,
  links: page.links,
  socialLinks: page.socialLinks,
  seo: page.seo,
  analytics: page.analytics,
  isPublished: page.isPublished,
  publishedAt: page.publishedAt,
  publicUrl: publicUrlFor(page.slug, page.customDomain),
  createdAt: page.createdAt,
  updatedAt: page.updatedAt,
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const pages = await LinkInBio.find({ workspace: req.auth!.workspaceId })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: { pages: pages.map(toDTO) } });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  }).lean();
  if (!page) throw new NotFoundError('Link-in-bio page not found');
  res.json({ success: true, data: { page: toDTO(page) } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await Subscription.findOne({ workspace: req.auth!.workspaceId }).lean();
  const plan = getPlan(subscription?.plan ?? 'free');
  if (!plan.entitlements.linkInBio) {
    throw new ForbiddenError('Link-in-bio pages require the Starter plan or above');
  }

  if (req.body.slug && isReservedSlug(req.body.slug)) {
    throw new BadRequestError('This slug is reserved — please choose another one');
  }

  const page = await createLinkInBio({
    workspaceId: req.auth!.workspaceId,
    title: req.body.title,
    slug: req.body.slug,
    bio: req.body.bio,
    instagramAccountId: req.body.instagramAccountId,
  });

  if (req.body.theme) page.theme = { ...page.theme, ...req.body.theme } as any;
  if (req.body.links) page.links = req.body.links.map((l: any, i: number) => ({ ...l, id: l.id ?? `link_${i}`, order: l.order ?? i, clicks: 0 }));
  if (req.body.socialLinks) page.socialLinks = req.body.socialLinks;
  if (req.body.seo) page.seo = req.body.seo;
  if (req.body.avatarUrl) page.avatarUrl = req.body.avatarUrl;
  if (req.body.isPublished !== undefined) {
    page.isPublished = req.body.isPublished;
    page.publishedAt = req.body.isPublished ? new Date() : undefined;
  }
  await page.save();

  res.status(201).json({ success: true, data: { page: toDTO(page) } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!page) throw new NotFoundError('Link-in-bio page not found');

  if (req.body.slug && req.body.slug !== page.slug) {
    if (isReservedSlug(req.body.slug)) {
      throw new BadRequestError('This slug is reserved — please choose another one');
    }
    const slug = await uniqueSlug(req.auth!.workspaceId, req.body.slug);
    page.slug = slug;
  }

  if (req.body.title !== undefined) page.title = req.body.title;
  if (req.body.bio !== undefined) page.bio = req.body.bio;
  if (req.body.avatarUrl !== undefined) page.avatarUrl = req.body.avatarUrl;
  if (req.body.theme) page.theme = { ...page.theme, ...req.body.theme } as any;
  if (req.body.links) {
    page.links = req.body.links.map((link: any, index: number) => {
      const existing = page.links.find((l) => l.id === link.id);
      return {
        id: link.id ?? `link_${index}`,
        title: link.title,
        url: link.url,
        isActive: link.isActive ?? true,
        order: link.order ?? index,
        clicks: existing?.clicks ?? 0,
        thumbnailUrl: link.thumbnailUrl,
        utm: link.utm,
      };
    });
  }
  if (req.body.socialLinks) page.socialLinks = req.body.socialLinks;
  if (req.body.seo) page.seo = { ...page.seo, ...req.body.seo };
  if (req.body.isPublished !== undefined) {
    page.isPublished = req.body.isPublished;
    page.publishedAt = req.body.isPublished ? new Date() : undefined;
  }

  await page.save();
  res.json({ success: true, data: { page: toDTO(page) } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOneAndDelete({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!page) throw new NotFoundError('Link-in-bio page not found');
  await LinkInBioEvent.deleteMany({ linkInBio: page._id });
  res.json({ success: true, message: 'Page deleted' });
});

export const analytics = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days ?? 30);
  const data = await getLinkInBioAnalytics(req.auth!.workspaceId, req.params.id, days);
  res.json({ success: true, data });
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOneAndUpdate(
    { _id: req.params.id, workspace: req.auth!.workspaceId },
    { $set: { isPublished: true, publishedAt: new Date() } },
    { new: true },
  );
  if (!page) throw new NotFoundError('Link-in-bio page not found');
  res.json({ success: true, data: { page: toDTO(page) } });
});

export const unpublish = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOneAndUpdate(
    { _id: req.params.id, workspace: req.auth!.workspaceId },
    { $set: { isPublished: false } },
    { new: true },
  );
  if (!page) throw new NotFoundError('Link-in-bio page not found');
  res.json({ success: true, data: { page: toDTO(page) } });
});

/** Public (unauthenticated) endpoint used by the link-in-bio renderer. */
export const publicPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOne({ slug: req.params.slug, isPublished: true }).lean();
  if (!page) throw new NotFoundError('This page does not exist');

  const visitorId =
    (req.header('x-visitor-id') as string | undefined) ?? `${req.ip}-${req.header('user-agent') ?? ''}`;

  await LinkInBio.updateOne({ _id: page._id }, { $inc: { 'analytics.views': 1 } });
  await LinkInBioEvent.create({
    workspace: page.workspace,
    linkInBio: page._id,
    type: 'view',
    visitorId,
    referrer: req.header('referer'),
    userAgent: req.header('user-agent'),
  });

  res.json({
    success: true,
    data: {
      page: {
        slug: page.slug,
        title: page.title,
        bio: page.bio,
        avatarUrl: page.avatarUrl,
        theme: page.theme,
        links: (page.links ?? []).filter((l) => l.isActive),
        socialLinks: page.socialLinks,
        seo: page.seo,
      },
    },
  });
});

/** Public click tracking endpoint. */
export const trackClick = asyncHandler(async (req: Request, res: Response) => {
  const page = await LinkInBio.findOne({ slug: req.params.slug, isPublished: true });
  if (!page) throw new NotFoundError('This page does not exist');

  const visitorId =
    (req.header('x-visitor-id') as string | undefined) ?? `${req.ip}-${req.header('user-agent') ?? ''}`;

  await LinkInBio.updateOne(
    { _id: page._id },
    { $inc: { 'analytics.clicks': 1, 'links.$[link].clicks': 1 } },
    { arrayFilters: [{ 'link.id': req.params.linkId }] },
  );
  await LinkInBioEvent.create({
    workspace: page.workspace,
    linkInBio: page._id,
    linkId: req.params.linkId,
    type: 'click',
    visitorId,
    referrer: req.header('referer'),
  });

  const { recordUsage } = await import('../services/usage.service');
  await recordUsage(page.workspace.toString(), 'link_clicks');

  const link = (page.links ?? []).find((l) => l.id === req.params.linkId);
  res.json({ success: true, data: { url: link?.url ?? env.APP_BASE_URL } });
});
