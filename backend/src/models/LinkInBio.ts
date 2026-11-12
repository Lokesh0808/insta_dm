import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ILinkInBioLink {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  clicks: number;
  order: number;
  thumbnailUrl?: string;
  /** Optional deep link / affiliate parameters. */
  utm?: Record<string, string>;
}

export interface ILinkInBio extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  /** Public slug used for `/{slug}` pages. */
  slug: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  theme: {
    template: 'minimal' | 'gradient' | 'cards' | 'glass' | 'sunset';
    backgroundColor: string;
    backgroundImageUrl?: string;
    accentColor: string;
    textColor: string;
    buttonStyle: 'solid' | 'outline' | 'soft' | 'pill';
    showInstagramProfile: boolean;
    fontFamily: string;
  };
  links: ILinkInBioLink[];
  socialLinks: Array<{ platform: string; url: string }>;
  instagramAccount?: mongoose.Types.ObjectId;
  customDomain?: string;
  /** SEO */
  seo: { title?: string; description?: string; imageUrl?: string };
  analytics: {
    views: number;
    clicks: number;
    uniqueVisitors: number;
  };
  isPublished: boolean;
  publishedAt?: Date;
}

const linkSchema = new Schema<ILinkInBioLink>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    clicks: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    thumbnailUrl: { type: String },
    utm: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const socialLinkSchema = new Schema(
  {
    platform: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const linkInBioSchema = new Schema<ILinkInBio>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, default: '', maxlength: 1000 },
    avatarUrl: { type: String },
    theme: {
      template: {
        type: String,
        enum: ['minimal', 'gradient', 'cards', 'glass', 'sunset'],
        default: 'gradient',
      },
      backgroundColor: { type: String, default: '#0f172a' },
      backgroundImageUrl: { type: String },
      accentColor: { type: String, default: '#6366f1' },
      textColor: { type: String, default: '#ffffff' },
      buttonStyle: {
        type: String,
        enum: ['solid', 'outline', 'soft', 'pill'],
        default: 'solid',
      },
      showInstagramProfile: { type: Boolean, default: true },
      fontFamily: { type: String, default: 'Inter' },
    },
    links: { type: [linkSchema], default: [] },
    socialLinks: { type: [socialLinkSchema], default: [] },
    instagramAccount: { type: Schema.Types.ObjectId, ref: 'InstagramAccount' },
    customDomain: { type: String, sparse: true, index: true },
    seo: {
      title: { type: String },
      description: { type: String },
      imageUrl: { type: String },
    },
    analytics: {
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
    },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

linkInBioSchema.index({ workspace: 1, slug: 1 }, { unique: true });
linkInBioSchema.index({ slug: 1, isPublished: 1 });
linkInBioSchema.index({ workspace: 1, createdAt: -1 });

export const LinkInBio: Model<ILinkInBio> =
  (mongoose.models.LinkInBio as Model<ILinkInBio>) ||
  mongoose.model<ILinkInBio>('LinkInBio', linkInBioSchema);

/** Raw click / view events powering the link-in-bio analytics dashboard. */
export interface ILinkInBioEvent extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  linkInBio: mongoose.Types.ObjectId;
  linkId?: string;
  type: 'view' | 'click';
  visitorId: string;
  referrer?: string;
  device?: string;
  country?: string;
  userAgent?: string;
}

const linkInBioEventSchema = new Schema<ILinkInBioEvent>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    linkInBio: { type: Schema.Types.ObjectId, ref: 'LinkInBio', required: true, index: true },
    linkId: { type: String },
    type: { type: String, enum: ['view', 'click'], required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    referrer: { type: String },
    device: { type: String },
    country: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

linkInBioEventSchema.index({ linkInBio: 1, createdAt: -1 });
linkInBioEventSchema.index({ workspace: 1, createdAt: -1 });

export const LinkInBioEvent: Model<ILinkInBioEvent> =
  (mongoose.models.LinkInBioEvent as Model<ILinkInBioEvent>) ||
  mongoose.model<ILinkInBioEvent>('LinkInBioEvent', linkInBioEventSchema);
