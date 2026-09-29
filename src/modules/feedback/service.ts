import { randomUUID } from "node:crypto";
import type { DemoUser } from "../auth/demo-users";
import { canManageRoadmap, canModerate } from "../auth/policy";
import { getFeedbackDatabase, transaction } from "./repository";
import { commandSchema } from "./schemas";
import type { FeedbackDatabase, FeedbackPost } from "./types";
import { insist } from "./errors";
const now = () => new Date().toISOString();
const uid = (prefix: string) => prefix + "-" + randomUUID();
function currentUser(
  db: FeedbackDatabase,
  user: DemoUser | null,
): DemoUser | null {
  const found = user && db.users.find((x) => x.id === user.id);
  return found ? { ...found, email: "" } : null;
}
function actor(db: FeedbackDatabase, user: DemoUser | null) {
  const result = currentUser(db, user);
  insist(result, 401, "Sign in again before saving.");
  return result;
}
function visible(db: FeedbackDatabase, p: FeedbackPost, user: DemoUser | null) {
  return Boolean(
    (user || db.settings.allowGuestBrowsing) &&
      (!p.hiddenAt || canModerate(user)) &&
      (p.visibility === "public" || canModerate(user)),
  );
}
function getPost(db: FeedbackDatabase, postId: string, user: DemoUser) {
  const p = db.posts.find((x) => x.id === postId);
  insist(p && visible(db, p, user), 404, "Post is unavailable.");
  return p;
}
function writable(p: FeedbackPost) {
  insist(
    !p.duplicateOfPostId && !p.hiddenAt,
    409,
    "This post is archived as hidden or duplicate.",
  );
}
function expected(record: { version: number }, value: number) {
  insist(
    record.version === value,
    409,
    "This record changed. Export your draft, then load the current version.",
  );
  insist(record.version < 2147483646, 409, "Record version exhausted.");
}
function touch(p: FeedbackPost) {
  p.version++;
  p.updatedAt = now();
  p.lastActivityAt = p.updatedAt;
}
function audit(
  db: FeedbackDatabase,
  u: DemoUser,
  postId: string,
  actionType: string,
  details: string,
) {
  db.moderationActions.unshift({
    id: uid("audit"),
    postId,
    actionType,
    actorId: u.id,
    details,
    createdAt: now(),
  });
}
function notify(
  db: FeedbackDatabase,
  p: FeedbackPost,
  title: string,
  body: string,
) {
  for (const f of db.follows.filter((x) => x.postId === p.id)) {
    const u = currentUser(db, { id: f.userId } as DemoUser);
    if (u && visible(db, p, u))
      db.notifications.unshift({
        id: uid("notification"),
        userId: u.id,
        title,
        body,
        isRead: false,
        createdAt: now(),
      });
  }
}
export async function executeCommand(
  user: DemoUser,
  raw: unknown,
): Promise<{ message: string; redirect?: string }> {
  const cmd = commandSchema.parse(raw);
  return transaction((db) => {
    const u = actor(db, user);
    if (cmd.action === "settings") {
      insist(u.role === "admin", 403, "Only admins may change settings.");
      expected(db.settings, cmd.version);
      db.settings = {
        ...db.settings,
        version: db.settings.version + 1,
        allowGuestBrowsing: cmd.allowGuestBrowsing,
        allowVoting: cmd.allowVoting,
        portalMode: cmd.portalMode,
      };
      audit(db, u, "settings", "settings.changed", "Portal settings changed.");
      return { message: "Settings saved." };
    }
    if (cmd.action === "readNotification") {
      const n = db.notifications.find(
        (x) => x.id === cmd.notificationId && x.userId === u.id,
      );
      insist(n, 404, "Notification unavailable.");
      n.isRead = true;
      return { message: "Notification marked read." };
    }
    if (cmd.action === "resolveFlag") {
      insist(canModerate(u), 403, "Moderation role required.");
      const f = db.flags.find((x) => x.id === cmd.flagId);
      insist(f, 404, "Flag unavailable.");
      getPost(db, f.postId, u);
      if (f.status !== "resolved") {
        f.status = "resolved";
        audit(db, u, f.postId, "flag.resolved", "Flag resolved.");
      }
      return { message: "Flag resolved." };
    }
    if (cmd.action === "createPost") {
      insist(
        db.categories.some((x) => x.id === cmd.categoryId),
        400,
        "Choose an existing category.",
      );
      insist(
        cmd.visibility === "public" ||
          (canModerate(u) && db.settings.portalMode === "mixed"),
        403,
        "Internal posts require staff access and mixed portal mode.",
      );
      const id = uid("post");
      const slug =
        (cmd.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 55) || "idea") +
        "-" +
        id.slice(5);
      const time = now();
      const p: FeedbackPost = {
        id,
        version: 1,
        slug,
        title: cmd.title,
        body: cmd.body,
        categoryId: cmd.categoryId,
        visibility: cmd.visibility,
        authorId: u.id,
        tagIds: [],
        status: "Open",
        duplicateOfPostId: null,
        commentsLocked: false,
        hiddenAt: null,
        createdAt: time,
        updatedAt: time,
        lastActivityAt: time,
      };
      db.posts.unshift(p);
      audit(db, u, p.id, "post.created", "Idea created.");
      return { message: "Idea created.", redirect: "/post/" + p.slug };
    }
    if (cmd.action === "merge") {
      insist(canModerate(u), 403, "Moderation role required.");
      const source = getPost(db, cmd.sourcePostId, u),
        target = getPost(db, cmd.targetPostId, u);
      insist(source.id !== target.id, 400, "Choose two different posts.");
      writable(source);
      writable(target);
      expected(source, cmd.sourceVersion);
      expected(target, cmd.targetVersion);
      insist(
        source.visibility === target.visibility,
        409,
        "Merge requires matching visibility.",
      );
      insist(
        !db.posts.some((x) => x.duplicateOfPostId === source.id),
        409,
        "This source is already a canonical target; merge its duplicates separately first.",
      );
      source.duplicateOfPostId = target.id;
      source.status = "Duplicate";
      source.commentsLocked = true;
      touch(source);
      touch(target);
      for (const key of ["votes", "follows"] as const) {
        const sourceRows = db[key].filter((x) => x.postId === source.id);
        db[key] = db[key].filter((x) => x.postId !== source.id);
        for (const row of sourceRows)
          if (
            !db[key].some(
              (x) => x.postId === target.id && x.userId === row.userId,
            )
          )
            db[key].push({ ...row, postId: target.id });
      }
      for (const f of db.flags)
        if (f.postId === source.id) f.status = "resolved";
      db.mergeHistory.unshift({
        id: uid("merge"),
        sourcePostId: source.id,
        targetPostId: target.id,
        actorId: u.id,
        createdAt: now(),
      });
      audit(db, u, source.id, "post.merged", "Merged into " + target.id);
      audit(
        db,
        u,
        target.id,
        "post.merge-target",
        "Received duplicate " + source.id,
      );
      return {
        message:
          "Duplicate merged; discussion history remains on its original post.",
      };
    }
    const p = getPost(db, cmd.postId, u);
    if (cmd.action === "moderate") {
      insist(canModerate(u), 403, "Moderation role required.");
      expected(p, cmd.version);
      insist(
        !p.duplicateOfPostId || cmd.commentsLocked,
        409,
        "Duplicate discussions remain locked.",
      );
      p.hiddenAt = cmd.hidden ? p.hiddenAt || now() : null;
      p.commentsLocked = cmd.commentsLocked;
      touch(p);
      audit(
        db,
        u,
        p.id,
        "post.moderated",
        `Hidden: ${cmd.hidden}; comments locked: ${cmd.commentsLocked}.`,
      );
      return { message: "Moderation saved." };
    }
    writable(p);
    if (cmd.action === "editPost") {
      insist(p.authorId === u.id, 403, "Only the author may edit this idea.");
      expected(p, cmd.version);
      insist(
        db.categories.some((x) => x.id === cmd.categoryId),
        400,
        "Choose an existing category.",
      );
      insist(
        cmd.visibility === p.visibility,
        409,
        "Visibility is fixed after creation to preserve discussion privacy.",
      );
      p.title = cmd.title;
      p.body = cmd.body;
      p.categoryId = cmd.categoryId;
      touch(p);
      audit(db, u, p.id, "post.edited", "Idea content edited.");
      return { message: "Idea saved." };
    }
    if (cmd.action === "deletePost") {
      insist(
        p.authorId === u.id,
        403,
        "Only the author may delete an unused idea.",
      );
      expected(p, cmd.version);
      insist(
        p.status === "Open",
        409,
        "Only open, unused ideas can be deleted; ask a moderator to hide this post.",
      );
      const referenced =
        [
          db.votes,
          db.follows,
          db.comments,
          db.flags,
          db.officialUpdates,
          db.internalNotes,
        ].some((rows) => rows.some((x) => x.postId === p.id)) ||
        db.mergeHistory.some(
          (x) => x.sourcePostId === p.id || x.targetPostId === p.id,
        );
      insist(
        !referenced,
        409,
        "This idea has discussion or history. Hide it instead of deleting it.",
      );
      db.posts = db.posts.filter((x) => x.id !== p.id);
      audit(db, u, p.id, "post.deleted", "Unused idea deleted.");
      return { message: "Idea deleted.", redirect: "/" };
    }
    if (cmd.action === "vote" || cmd.action === "follow") {
      if (cmd.action === "vote")
        insist(db.settings.allowVoting, 409, "Voting is currently disabled.");
      const key = cmd.action === "vote" ? "votes" : "follows";
      const exists = db[key].some(
        (x) => x.postId === p.id && x.userId === u.id,
      );
      if (cmd.enabled && !exists)
        db[key].push({
          id: uid(cmd.action),
          postId: p.id,
          userId: u.id,
          createdAt: now(),
        });
      if (!cmd.enabled)
        db[key] = db[key].filter(
          (x) => !(x.postId === p.id && x.userId === u.id),
        );
      return {
        message:
          cmd.action === "vote"
            ? cmd.enabled
              ? "Vote recorded."
              : "Vote removed."
            : cmd.enabled
              ? "Following idea."
              : "Unfollowed idea.",
      };
    }
    if (cmd.action === "comment") {
      insist(!p.commentsLocked, 409, "Comments are locked.");
      const time = now();
      db.comments.push({
        id: uid("comment"),
        postId: p.id,
        authorId: u.id,
        body: cmd.body,
        version: 1,
        parentCommentId: null,
        isHidden: false,
        createdAt: time,
        updatedAt: time,
      });
      audit(db, u, p.id, "comment.created", "Comment added.");
      return { message: "Comment added." };
    }
    if (cmd.action === "editComment" || cmd.action === "deleteComment") {
      const c = db.comments.find(
        (x) => x.id === cmd.commentId && x.postId === p.id,
      );
      insist(c, 404, "Comment unavailable.");
      expected(c, cmd.version);
      if (cmd.action === "editComment") {
        insist(
          c.authorId === u.id,
          403,
          "Only the author may edit this comment.",
        );
        insist(
          !p.commentsLocked && !c.isHidden,
          409,
          "This discussion is locked.",
        );
        c.body = cmd.body;
        c.version++;
        c.updatedAt = now();
        audit(db, u, p.id, "comment.edited", "Comment edited: " + c.id);
        return { message: "Comment saved." };
      }
      insist(
        c.authorId === u.id || canModerate(u),
        403,
        "Comment author or moderator required.",
      );
      insist(
        !db.comments.some((x) => x.parentCommentId === c.id),
        409,
        "This comment has replies; retain its history.",
      );
      db.comments = db.comments.filter((x) => x.id !== c.id);
      audit(
        db,
        u,
        p.id,
        c.authorId === u.id ? "comment.deleted" : "comment.moderated",
        "Comment deleted: " + c.id,
      );
      return { message: "Comment deleted." };
    }
    if (cmd.action === "flag") {
      if (
        !db.flags.some(
          (x) =>
            x.postId === p.id &&
            x.createdBy === u.id &&
            x.reason === cmd.reason &&
            x.status === "open",
        )
      )
        db.flags.unshift({
          id: uid("flag"),
          postId: p.id,
          createdBy: u.id,
          reason: cmd.reason,
          status: "open",
          createdAt: now(),
        });
      return { message: "Flag submitted for review." };
    }
    insist(canManageRoadmap(u), 403, "Product manager or admin required.");
    if (cmd.action === "status") {
      expected(p, cmd.version);
      p.status = cmd.status;
      touch(p);
      audit(db, u, p.id, "status.changed", "Status changed to " + p.status);
      notify(
        db,
        p,
        p.title + " moved to " + p.status,
        "A product-team status update was posted.",
      );
      return { message: "Status saved." };
    }
    const entry = {
      id: uid(cmd.action),
      postId: p.id,
      body: cmd.body,
      createdBy: u.id,
      createdAt: now(),
    };
    if (cmd.action === "official") {
      db.officialUpdates.unshift(entry);
      notify(db, p, "Official update added", cmd.body);
    } else db.internalNotes.unshift(entry);
    audit(
      db,
      u,
      p.id,
      cmd.action + ".created",
      cmd.action === "official"
        ? "Official update published."
        : "Internal note added.",
    );
    return {
      message:
        cmd.action === "official"
          ? "Official update published."
          : "Internal note added.",
    };
  });
}
function name(db: FeedbackDatabase, id: string) {
  return db.users.find((x) => x.id === id)?.name || "Unknown";
}
export async function getBoardHome(
  user: DemoUser | null,
  filters: { q?: string; status?: string; category?: string; page?: string },
) {
  const db = await getFeedbackDatabase();
  const u = currentUser(db, user);
  const q = (filters.q || "").trim().slice(0, 120).toLowerCase();
  const page = /^[1-9][0-9]{0,3}$/.test(filters.page || "")
    ? Number(filters.page)
    : 1;
  const all = db.posts
    .filter((p) => visible(db, p, u) && !p.hiddenAt && !p.duplicateOfPostId)
    .filter(
      (p) =>
        (!filters.status || p.status === filters.status) &&
        (!filters.category || p.categoryId === filters.category) &&
        (!q || (p.title + " " + p.body).toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        b.lastActivityAt.localeCompare(a.lastActivityAt) ||
        a.id.localeCompare(b.id),
    );
  const posts = all
    .slice((page - 1) * 20, page * 20)
    .map((p) => ({
      ...p,
      categoryName:
        db.categories.find((c) => c.id === p.categoryId)?.name || "Unknown",
      authorName: name(db, p.authorId),
      voteCount: db.votes.filter((x) => x.postId === p.id).length,
      commentCount: db.comments.filter((x) => x.postId === p.id && !x.isHidden)
        .length,
      tagNames: p.tagIds.map((id) => db.tags.find((x) => x.id === id)!.name),
    }));
  return {
    posts,
    page,
    total: all.length,
    guestBlocked: !u && !db.settings.allowGuestBrowsing,
    categories:
      !u && !db.settings.allowGuestBrowsing
        ? []
        : db.categories.sort((a, b) => a.displayOrder - b.displayOrder),
    metrics: {
      totalPosts: all.length,
      plannedOrBuilding: all.filter((p) =>
        ["Planned", "In Progress"].includes(p.status),
      ).length,
      shipped: all.filter((p) => p.status === "Shipped").length,
    },
  };
}
export async function getPostDetail(user: DemoUser | null, slug: string) {
  const db = await getFeedbackDatabase();
  const u = currentUser(db, user);
  const p = db.posts.find((x) => x.slug === slug);
  if (!p || !visible(db, p, u)) return null;
  return {
    post: p,
    categories: db.categories,
    votingEnabled: db.settings.allowVoting,
    categoryName:
      db.categories.find((x) => x.id === p.categoryId)?.name || "Unknown",
    authorName: name(db, p.authorId),
    voteCount: db.votes.filter((x) => x.postId === p.id).length,
    hasVoted: db.votes.some((x) => x.postId === p.id && x.userId === u?.id),
    isFollowing: db.follows.some(
      (x) => x.postId === p.id && x.userId === u?.id,
    ),
    canonicalSlug: db.posts.find((x) => x.id === p.duplicateOfPostId)?.slug,
    comments: db.comments
      .filter((x) => x.postId === p.id && (!x.isHidden || canModerate(u)))
      .map((x) => ({ ...x, authorName: name(db, x.authorId) })),
    officialUpdates: db.officialUpdates
      .filter((x) => x.postId === p.id)
      .map((x) => ({ ...x, authorName: name(db, x.createdBy) })),
    internalNotes: canManageRoadmap(u)
      ? db.internalNotes
          .filter((x) => x.postId === p.id)
          .map((x) => ({ ...x, authorName: name(db, x.createdBy) }))
      : [],
    moderationActions: canModerate(u)
      ? db.moderationActions
          .filter((x) => x.postId === p.id)
          .slice(0, 30)
          .map((x) => ({ ...x, actorName: name(db, x.actorId) }))
      : [],
  };
}
export async function getDashboardData(user: DemoUser) {
  const db = await getFeedbackDatabase();
  insist(canModerate(actor(db, user)), 403, "Staff access required.");
  return {
    topPosts: db.posts
      .filter(
        (p) => p.visibility === "public" && !p.hiddenAt && !p.duplicateOfPostId,
      )
      .map((p) => ({
        ...p,
        voteCount: db.votes.filter((x) => x.postId === p.id).length,
      }))
      .sort((a, b) => b.voteCount - a.voteCount || a.id.localeCompare(b.id))
      .slice(0, 5),
    postsByStatus: db.settings.statuses.map((status) => ({
      status,
      count: db.posts.filter((p) => p.status === status).length,
    })),
    openFlags: db.flags.filter((x) => x.status === "open").length,
    recentModeration: db.moderationActions
      .slice(0, 6)
      .map((x) => ({ ...x, actorName: name(db, x.actorId) })),
  };
}
export async function getModerationCenter(user: DemoUser) {
  const db = await getFeedbackDatabase();
  insist(canModerate(actor(db, user)), 403, "Staff access required.");
  return {
    posts: db.posts,
    flags: db.flags
      .filter((x) => x.status === "open")
      .map((x) => ({
        ...x,
        postTitle: db.posts.find((p) => p.id === x.postId)?.title || "Unknown",
        createdByName: name(db, x.createdBy),
      })),
  };
}
export async function getNotifications(user: DemoUser) {
  const db = await getFeedbackDatabase();
  const u = actor(db, user);
  return db.notifications.filter((x) => x.userId === u.id).slice(0, 100);
}
