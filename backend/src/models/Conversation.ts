import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IConversation extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  instagramAccount: mongoose.Types.ObjectId;
  /** Instagram-scoped user id of the person chatting. */
  igUserId: string;
  igUsername?: string;
  displayName?: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageFrom?: 'inbound' | 'outbound';
  unreadCount: number;
  isAutomated: boolean;
  automation?: mongoose.Types.ObjectId;
  /** True while we are inside the 24h messaging window. */
  messagingWindowExpiresAt?: Date;
  tags: string[];
  status: 'open' | 'closed';
}

const conversationSchema = new Schema<IConversation>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
      index: true,
    },
    igUserId: { type: String, required: true },
    igUsername: { type: String },
    displayName: { type: String },
    avatarUrl: { type: String },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    lastMessageFrom: { type: String, enum: ['inbound', 'outbound'] },
    unreadCount: { type: Number, default: 0 },
    isAutomated: { type: Boolean, default: false },
    automation: { type: Schema.Types.ObjectId, ref: 'Automation' },
    messagingWindowExpiresAt: { type: Date },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  },
  { timestamps: true },
);

conversationSchema.index({ workspace: 1, instagramAccount: 1, igUserId: 1 }, { unique: true });
conversationSchema.index({ workspace: 1, lastMessageAt: -1 });
conversationSchema.index({ workspace: 1, unreadCount: -1 });

export const Conversation: Model<IConversation> =
  (mongoose.models.Conversation as Model<IConversation>) ||
  mongoose.model<IConversation>('Conversation', conversationSchema);
