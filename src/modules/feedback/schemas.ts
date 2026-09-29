import { z } from "zod";
import { id, version } from "./database-schema";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v),
      "Control characters are not allowed",
    );
export const postSchema = z
  .object({
    title: text(4, 120),
    body: text(10, 4000),
    categoryId: id,
    visibility: z.enum(["public", "internal"]),
  })
  .strict();
const target = { postId: id };
const expected = { ...target, version };
export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createPost"), ...postSchema.shape }).strict(),
  z
    .object({ action: z.literal("editPost"), ...expected, ...postSchema.shape })
    .strict(),
  z.object({ action: z.literal("deletePost"), ...expected }).strict(),
  z
    .object({ action: z.literal("vote"), ...target, enabled: z.boolean() })
    .strict(),
  z
    .object({ action: z.literal("follow"), ...target, enabled: z.boolean() })
    .strict(),
  z
    .object({ action: z.literal("comment"), ...target, body: text(2, 1200) })
    .strict(),
  z
    .object({
      action: z.literal("editComment"),
      ...target,
      commentId: id,
      version,
      body: text(2, 1200),
    })
    .strict(),
  z
    .object({
      action: z.literal("deleteComment"),
      ...target,
      commentId: id,
      version,
    })
    .strict(),
  z
    .object({
      action: z.literal("flag"),
      ...target,
      reason: z.enum([
        "spam",
        "abuse",
        "duplicate",
        "off-topic",
        "low-quality",
      ]),
    })
    .strict(),
  z
    .object({ action: z.literal("official"), ...target, body: text(3, 1200) })
    .strict(),
  z
    .object({ action: z.literal("note"), ...target, body: text(3, 1200) })
    .strict(),
  z
    .object({
      action: z.literal("status"),
      ...expected,
      status: z.enum([
        "Open",
        "Under Review",
        "Planned",
        "In Progress",
        "Shipped",
        "Declined",
      ]),
    })
    .strict(),
  z
    .object({
      action: z.literal("moderate"),
      ...expected,
      hidden: z.boolean(),
      commentsLocked: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("merge"),
      sourcePostId: id,
      targetPostId: id,
      sourceVersion: version,
      targetVersion: version,
    })
    .strict(),
  z.object({ action: z.literal("resolveFlag"), flagId: id }).strict(),
  z
    .object({ action: z.literal("readNotification"), notificationId: id })
    .strict(),
  z
    .object({
      action: z.literal("settings"),
      version,
      allowGuestBrowsing: z.boolean(),
      allowVoting: z.boolean(),
      portalMode: z.enum(["public", "mixed"]),
    })
    .strict(),
]);
export type Command = z.infer<typeof commandSchema>;
