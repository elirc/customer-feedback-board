import type { FeedbackRole } from "@/modules/auth/demo-users";

export type PostStatus =
  | "Open"
  | "Under Review"
  | "Planned"
  | "In Progress"
  | "Shipped"
  | "Declined"
  | "Duplicate";
export type PostVisibility = "public" | "internal";
export type FlagReason =
  | "spam"
  | "abuse"
  | "duplicate"
  | "off-topic"
  | "low-quality";

export type FeedbackUser = {
  id: string;
  name: string;
  role: FeedbackRole;
};

export type FeedbackPost = {
  version: number;
  id: string;
  title: string;
  slug: string;
  body: string;
  categoryId: string;
  tagIds: string[];
  authorId: string;
  status: PostStatus;
  visibility: PostVisibility;
  duplicateOfPostId: string | null;
  commentsLocked: boolean;
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};

export type Vote = {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
};

export type Comment = {
  version: number;
  id: string;
  postId: string;
  authorId: string;
  body: string;
  parentCommentId: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Follow = {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
};

export type Tag = {
  id: string;
  name: string;
};

export type ModerationFlag = {
  id: string;
  postId: string;
  createdBy: string;
  reason: FlagReason;
  createdAt: string;
  status: "open" | "resolved";
};

export type ModerationAction = {
  id: string;
  postId: string;
  actionType: string;
  actorId: string;
  details: string;
  createdAt: string;
};

export type MergeHistory = {
  id: string;
  sourcePostId: string;
  targetPostId: string;
  actorId: string;
  createdAt: string;
};

export type OfficialUpdate = {
  id: string;
  postId: string;
  body: string;
  createdBy: string;
  createdAt: string;
};

export type InternalNote = {
  id: string;
  postId: string;
  body: string;
  createdBy: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type FeedbackSettings = {
  version: number;
  allowGuestBrowsing: boolean;
  allowVoting: boolean;
  portalMode: "public" | "mixed";
  statuses: PostStatus[];
};

export type FeedbackDatabase = {
  revision: number;
  users: FeedbackUser[];
  posts: FeedbackPost[];
  votes: Vote[];
  comments: Comment[];
  follows: Follow[];
  categories: Category[];
  tags: Tag[];
  flags: ModerationFlag[];
  moderationActions: ModerationAction[];
  mergeHistory: MergeHistory[];
  officialUpdates: OfficialUpdate[];
  internalNotes: InternalNote[];
  notifications: Notification[];
  settings: FeedbackSettings;
};
