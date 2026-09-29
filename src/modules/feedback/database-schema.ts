import { z } from "zod";
import type { FeedbackDatabase } from "./types";
export const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = (max: number, min = 0) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v),
      "Control characters are not allowed",
    );
export const version = z.number().int().min(1).max(2147483646);
const time = z.string().datetime();
export const statuses = [
  "Open",
  "Under Review",
  "Planned",
  "In Progress",
  "Shipped",
  "Declined",
  "Duplicate",
] as const;
const role = z.enum(["customer", "moderator", "product_manager", "admin"]);
const base = { id, createdAt: time };
const arrays = {
  users: z.array(z.object({ id, name: text(120), role }).strict()),
  posts: z.array(
    z
      .object({
        id,
        version,
        title: text(120, 4),
        slug: id,
        body: text(4000, 10),
        categoryId: id,
        tagIds: z.array(id).max(30),
        authorId: id,
        status: z.enum(statuses),
        visibility: z.enum(["public", "internal"]),
        duplicateOfPostId: id.nullable(),
        commentsLocked: z.boolean(),
        hiddenAt: time.nullable(),
        createdAt: time,
        updatedAt: time,
        lastActivityAt: time,
      })
      .strict(),
  ),
  votes: z.array(z.object({ ...base, postId: id, userId: id }).strict()),
  comments: z.array(
    z
      .object({
        ...base,
        version,
        postId: id,
        authorId: id,
        body: text(1200, 2),
        parentCommentId: id.nullable(),
        isHidden: z.boolean(),
        updatedAt: time,
      })
      .strict(),
  ),
  follows: z.array(z.object({ ...base, postId: id, userId: id }).strict()),
  categories: z.array(
    z
      .object({
        id,
        name: text(120),
        description: text(2000),
        displayOrder: z.number().int().min(0),
      })
      .strict(),
  ),
  tags: z.array(z.object({ id, name: text(80) }).strict()),
  flags: z.array(
    z
      .object({
        ...base,
        postId: id,
        createdBy: id,
        reason: z.enum([
          "spam",
          "abuse",
          "duplicate",
          "off-topic",
          "low-quality",
        ]),
        status: z.enum(["open", "resolved"]),
      })
      .strict(),
  ),
  moderationActions: z.array(
    z
      .object({
        ...base,
        postId: id,
        actionType: text(80),
        actorId: id,
        details: text(2000),
      })
      .strict(),
  ),
  mergeHistory: z.array(
    z
      .object({ ...base, sourcePostId: id, targetPostId: id, actorId: id })
      .strict(),
  ),
  officialUpdates: z.array(
    z.object({ ...base, postId: id, body: text(1200), createdBy: id }).strict(),
  ),
  internalNotes: z.array(
    z.object({ ...base, postId: id, body: text(1200), createdBy: id }).strict(),
  ),
  notifications: z.array(
    z
      .object({
        ...base,
        userId: id,
        title: text(200),
        body: text(1200),
        isRead: z.boolean(),
      })
      .strict(),
  ),
};
export const databaseSchema = z
  .object({
    revision: version,
    ...arrays,
    settings: z
      .object({
        version,
        allowGuestBrowsing: z.boolean(),
        allowVoting: z.boolean(),
        portalMode: z.enum(["public", "mixed"]),
        statuses: z.array(z.enum(statuses)).length(7),
      })
      .strict(),
  })
  .strict();
export function validateDatabase(value: unknown): FeedbackDatabase {
  const db = databaseSchema.parse(value);
  for (const key of Object.keys(arrays) as (keyof typeof arrays)[]) {
    const rows = db[key];
    if (
      rows.length > 10000 ||
      new Set(rows.map((x) => x.id)).size !== rows.length
    )
      throw new Error(`Invalid ${key} identities or capacity`);
  }
  const users = new Set(db.users.map((x) => x.id)),
    posts = new Map(db.posts.map((x) => [x.id, x])),
    categories = new Set(db.categories.map((x) => x.id)),
    tags = new Set(db.tags.map((x) => x.id));
  const requireRef = (ok: unknown) => {
    if (!ok) throw new Error("Invalid database reference");
  };
  requireRef(new Set(db.posts.map((x) => x.slug)).size === db.posts.length);
  requireRef(new Set(db.settings.statuses).size === 7);
  for (const p of db.posts) {
    requireRef(
      users.has(p.authorId) &&
        categories.has(p.categoryId) &&
        p.tagIds.every((x) => tags.has(x)),
    );
    requireRef((p.status === "Duplicate") === Boolean(p.duplicateOfPostId));
    if (p.duplicateOfPostId) {
      const target = posts.get(p.duplicateOfPostId);
      requireRef(
        target &&
          target.id !== p.id &&
          !target.duplicateOfPostId &&
          target.visibility === p.visibility,
      );
    }
  }
  for (const key of ["votes", "follows"] as const) {
    requireRef(
      new Set(db[key].map((x) => x.postId + ":" + x.userId)).size ===
        db[key].length,
    );
    for (const x of db[key])
      requireRef(posts.has(x.postId) && users.has(x.userId));
  }
  for (const c of db.comments) {
    requireRef(posts.has(c.postId) && users.has(c.authorId));
    if (c.parentCommentId)
      requireRef(
        db.comments.some(
          (p) =>
            p.id === c.parentCommentId &&
            p.postId === c.postId &&
            p.id !== c.id,
        ),
      );
  }
  for (const key of ["flags", "officialUpdates", "internalNotes"] as const)
    for (const x of db[key])
      requireRef(posts.has(x.postId) && users.has(x.createdBy));
  for (const x of db.mergeHistory)
    requireRef(
      posts.has(x.sourcePostId) &&
        posts.has(x.targetPostId) &&
        users.has(x.actorId),
    );
  // Audits intentionally retain identifiers after an allowed record deletion.
  for (const x of db.moderationActions) requireRef(users.has(x.actorId));
  for (const x of db.notifications) requireRef(users.has(x.userId));
  return db;
}
