import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  initializeDatabase,
  readDatabase,
  transact,
} from "../src/server/store";
import { fictionalSeed } from "../src/server/seed";
import { demoUsers } from "../src/modules/auth/demo-users";
import {
  executeCommand,
  getBoardHome,
  getPostDetail,
  getNotifications,
} from "../src/modules/feedback/service";
import {
  signSession,
  verifySession,
  passwordHash,
  verifyPassword,
} from "../src/modules/auth/credentials";
const [customer, moderator, pm, admin] = demoUsers;
let root: string;
const postId = "post-keyboard";
const run = (cmd: unknown, user = customer) => executeCommand(user, cmd);
const post = () => readDatabase().posts.find((p) => p.id === postId)!;
const create = (
  title = "A useful new idea",
  user = customer,
  visibility = "public",
) =>
  run(
    {
      action: "createPost",
      title,
      body: "Explain the everyday problem clearly.",
      categoryId: "category-workflow",
      visibility,
    },
    user,
  );
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "astra-feedback-test-"));
  process.env.FEEDBACK_DATABASE_PATH = join(root, "fixture.sqlite");
  process.env.FEEDBACK_SESSION_SECRET = "a".repeat(64);
  initializeDatabase(process.env.FEEDBACK_DATABASE_PATH, fictionalSeed());
});
afterEach(() => {
  assert.ok(root.startsWith(join(tmpdir(), "astra-feedback-test-")));
  rmSync(root, { recursive: true, force: true });
});
test("new database is valid and persists across independent reads", () => {
  assert.equal(readDatabase().posts.length, 2);
  assert.equal(readDatabase().revision, 1);
});
test("initialization refuses an existing database", () => {
  assert.throws(
    () =>
      initializeDatabase(process.env.FEEDBACK_DATABASE_PATH!, fictionalSeed()),
    /overwrite/,
  );
  assert.equal(readDatabase().posts.length, 2);
});
test("transaction exception rolls back the whole aggregate", () => {
  assert.throws(() =>
    transact((db) => {
      db.posts = [];
      throw new Error("injected");
    }),
  );
  assert.equal(readDatabase().posts.length, 2);
  assert.equal(readDatabase().revision, 1);
});
test("invalid reference cannot be persisted", () => {
  assert.throws(() =>
    transact((db) => {
      db.posts[0].categoryId = "absent";
    }),
  );
  assert.equal(post().categoryId, "category-accessibility");
});
test("duplicate identities cannot be persisted", () => {
  assert.throws(() =>
    transact((db) => {
      db.users.push(db.users[0]);
    }),
  );
  assert.equal(readDatabase().users.length, 4);
});
test("missing database is not silently recreated", () => {
  process.env.FEEDBACK_DATABASE_PATH = join(root, "missing.sqlite");
  assert.throws(readDatabase, /not initialized/);
  assert.equal(existsSync(process.env.FEEDBACK_DATABASE_PATH), false);
});
test("corrupt stored content is rejected without replacement", () => {
  const db = new DatabaseSync(process.env.FEEDBACK_DATABASE_PATH!);
  db.prepare("UPDATE workspace SET document=?").run("{}");
  db.close();
  assert.throws(readDatabase);
});
test("signed sessions expire and reject forged identity cookies", () => {
  const at = Date.now(),
    token = signSession(customer.id, at);
  assert.equal(verifySession(token, at), customer.id);
  assert.equal(verifySession(token, at + 1800000), null);
  assert.equal(verifySession(admin.id), null);
  assert.equal(verifySession(token.slice(0, -4) + "aaaa", at), null);
});
test("password hashes verify exact bounded input without storing plaintext", () => {
  const password = "fictional-password-123";
  const hash = passwordHash(password);
  assert.ok(!hash.includes(password));
  process.env.FEEDBACK_PASSWORD_HASHES = JSON.stringify({
    [customer.id]: hash,
  });
  assert.equal(verifyPassword(customer.id, password), true);
  assert.equal(verifyPassword(customer.id, "wrong-password"), false);
  assert.equal(verifyPassword(admin.id, password), false);
});
test("short missing session secret fails closed", () => {
  process.env.FEEDBACK_SESSION_SECRET = "short";
  assert.throws(() => signSession(customer.id));
});
test("guest and customer projections hide internal records and staff audit", async () => {
  await run(
    { action: "note", postId, body: "Private investigation detail" },
    pm,
  );
  const board = await getBoardHome(null, {});
  assert.equal(board.total, 1);
  assert.equal(await getPostDetail(customer, "internal-triage"), null);
  const detail = await getPostDetail(customer, "keyboard-shortcuts");
  assert.equal(detail?.internalNotes.length, 0);
  assert.equal(detail?.moderationActions.length, 0);
  assert.equal(
    (await getPostDetail(pm, "keyboard-shortcuts"))?.internalNotes.length,
    1,
  );
});
test("guest setting applies to board and direct detail", async () => {
  await run(
    {
      action: "settings",
      version: 1,
      allowGuestBrowsing: false,
      allowVoting: true,
      portalMode: "mixed",
    },
    admin,
  );
  assert.equal((await getBoardHome(null, {})).guestBlocked, true);
  assert.equal(await getPostDetail(null, "keyboard-shortcuts"), null);
  assert.equal((await getBoardHome(customer, {})).total, 1);
});
test("service refreshes role rather than trusting supplied role", async () => {
  await assert.rejects(
    run(
      {
        action: "settings",
        version: 1,
        allowGuestBrowsing: true,
        allowVoting: true,
        portalMode: "mixed",
      },
      { ...customer, role: "admin" },
    ),
    /Only admins/,
  );
});
test("deleted identity cannot mutate or retain staff read privileges", async () => {
  transact((db) => {
    db.users = db.users.filter((u) => u.id !== admin.id);
  });
  await assert.rejects(create("A forbidden idea", admin), /Sign in/);
  assert.equal((await getBoardHome(admin, {})).total, 1);
});
test("post create trims content and rejects unknown fields", async () => {
  await create("  A useful new idea  ");
  assert.equal(readDatabase().posts[0].title, "A useful new idea");
  await assert.rejects(
    run({
      action: "createPost",
      title: "Another idea",
      body: "This is a full description",
      categoryId: "category-workflow",
      visibility: "public",
      authorId: admin.id,
    }),
  );
});
test("same title and non-Latin titles get unique stable slugs", async () => {
  await create();
  await create();
  await create("\u65b0\u3057\u3044\u63d0\u6848");
  const db = readDatabase();
  assert.equal(new Set(db.posts.map((p) => p.slug)).size, db.posts.length);
  assert.ok(db.posts[0].slug.startsWith("idea-"));
});
test("category and internal visibility are validated", async () => {
  await assert.rejects(
    run({
      action: "createPost",
      title: "Another idea",
      body: "This is a full description",
      categoryId: "missing",
      visibility: "public",
    }),
    /category/,
  );
  await assert.rejects(
    create("Private customer idea", customer, "internal"),
    /Internal posts/,
  );
});
test("public portal mode rejects new internal ideas but preserves existing privacy", async () => {
  await run(
    {
      action: "settings",
      version: 1,
      allowGuestBrowsing: true,
      allowVoting: true,
      portalMode: "public",
    },
    admin,
  );
  await assert.rejects(
    create("Private team idea", pm, "internal"),
    /Internal posts/,
  );
  assert.equal(await getPostDetail(customer, "internal-triage"), null);
  assert.ok(await getPostDetail(pm, "internal-triage"));
});
test("owner edit preserves slug and increments version", async () => {
  const p = post();
  await run({
    action: "editPost",
    postId,
    version: 1,
    title: "Updated keyboard idea",
    body: p.body,
    categoryId: p.categoryId,
    visibility: p.visibility,
  });
  assert.equal(post().version, 2);
  assert.equal(post().slug, p.slug);
});
test("stale post edit does not overwrite accepted content", async () => {
  const p = post(),
    cmd = {
      action: "editPost",
      postId,
      version: 1,
      title: "First accepted title",
      body: p.body,
      categoryId: p.categoryId,
      visibility: p.visibility,
    };
  await run(cmd);
  await assert.rejects(run({ ...cmd, title: "Stale title" }), /record changed/);
  assert.equal(post().title, "First accepted title");
});
test("staff cannot impersonate the author when editing", async () => {
  const p = post();
  await assert.rejects(
    run(
      {
        action: "editPost",
        postId,
        version: 1,
        title: "Changed by admin",
        body: p.body,
        categoryId: p.categoryId,
        visibility: p.visibility,
      },
      admin,
    ),
    /Only the author/,
  );
});
test("visibility cannot change after creation", async () => {
  const p = post();
  await assert.rejects(
    run({
      action: "editPost",
      postId,
      version: 1,
      title: p.title,
      body: p.body,
      categoryId: p.categoryId,
      visibility: "internal",
    }),
    /Visibility is fixed/,
  );
});
test("unused open idea can be deleted with retained audit", async () => {
  await run({ action: "deletePost", postId, version: 1 });
  assert.ok(!readDatabase().posts.some((p) => p.id === postId));
  assert.ok(
    readDatabase().moderationActions.some(
      (x) => x.actionType === "post.deleted",
    ),
  );
});
test("referenced idea cannot be deleted", async () => {
  await run({ action: "comment", postId, body: "Useful context" });
  await assert.rejects(
    run({ action: "deletePost", postId, version: 1 }),
    /discussion or history/,
  );
});
test("desired vote state is idempotent and obeys settings", async () => {
  await run({ action: "vote", postId, enabled: true });
  await run({ action: "vote", postId, enabled: true });
  assert.equal(readDatabase().votes.length, 1);
  await run(
    {
      action: "settings",
      version: 1,
      allowGuestBrowsing: true,
      allowVoting: false,
      portalMode: "mixed",
    },
    admin,
  );
  await assert.rejects(
    run({ action: "vote", postId, enabled: false }),
    /disabled/,
  );
});
test("hidden and internal posts reject customer writes", async () => {
  await assert.rejects(
    run({ action: "follow", postId: "post-internal", enabled: true }),
    /unavailable/,
  );
  await run(
    {
      action: "moderate",
      postId,
      version: 1,
      hidden: true,
      commentsLocked: false,
    },
    moderator,
  );
  await assert.rejects(
    run({ action: "comment", postId, body: "Hidden comment" }),
    /unavailable/,
  );
  assert.ok(await getPostDetail(moderator, "keyboard-shortcuts"));
});
test("follow state is idempotent and nonexistent posts reject", async () => {
  await run({ action: "follow", postId, enabled: true });
  await run({ action: "follow", postId, enabled: true });
  assert.equal(readDatabase().follows.length, 1);
  await assert.rejects(
    run({ action: "follow", postId: "missing", enabled: true }),
    /unavailable/,
  );
});
test("comment owner can edit and delete with stale version detection", async () => {
  await run({ action: "comment", postId, body: "Original comment" });
  const c = readDatabase().comments[0];
  await run({
    action: "editComment",
    postId,
    commentId: c.id,
    version: 1,
    body: "Edited comment",
  });
  await assert.rejects(
    run({ action: "deleteComment", postId, commentId: c.id, version: 1 }),
    /record changed/,
  );
  await run({ action: "deleteComment", postId, commentId: c.id, version: 2 });
  assert.equal(readDatabase().comments.length, 0);
});
test("comment edit is author-only while moderator deletion is audited", async () => {
  await run({ action: "comment", postId, body: "Original comment" });
  const c = readDatabase().comments[0];
  await assert.rejects(
    run(
      {
        action: "editComment",
        postId,
        commentId: c.id,
        version: 1,
        body: "Admin rewrite",
      },
      admin,
    ),
    /Only the author/,
  );
  await run(
    { action: "deleteComment", postId, commentId: c.id, version: 1 },
    moderator,
  );
  assert.equal(
    readDatabase().moderationActions[0].actionType,
    "comment.moderated",
  );
});
test("comment ID must belong to the visible parent", async () => {
  await run(
    { action: "comment", postId: "post-internal", body: "Private comment" },
    pm,
  );
  const c = readDatabase().comments[0];
  await assert.rejects(
    run({ action: "deleteComment", postId, commentId: c.id, version: 1 }),
    /unavailable/,
  );
});
test("locked discussion blocks new comments and author edits", async () => {
  await run({ action: "comment", postId, body: "Original comment" });
  const c = readDatabase().comments[0];
  await run(
    {
      action: "moderate",
      postId,
      version: 1,
      hidden: false,
      commentsLocked: true,
    },
    moderator,
  );
  await assert.rejects(
    run({ action: "comment", postId, body: "New comment" }),
    /locked/,
  );
  await assert.rejects(
    run({
      action: "editComment",
      postId,
      commentId: c.id,
      version: 1,
      body: "Changed comment",
    }),
    /locked/,
  );
});
test("repeated flag deduplicates and resolution is staff-only", async () => {
  await run({ action: "flag", postId, reason: "duplicate" });
  await run({ action: "flag", postId, reason: "duplicate" });
  const db = readDatabase();
  assert.equal(db.flags.length, 1);
  await assert.rejects(
    run({ action: "resolveFlag", flagId: db.flags[0].id }),
    /Moderation/,
  );
  await run({ action: "resolveFlag", flagId: db.flags[0].id }, moderator);
  assert.equal(readDatabase().flags[0].status, "resolved");
});
test("status and notifications commit together and remain scoped", async () => {
  await run({ action: "follow", postId, enabled: true });
  await run({ action: "status", postId, version: 1, status: "Planned" }, pm);
  assert.equal(post().status, "Planned");
  assert.equal((await getNotifications(customer)).length, 1);
  assert.equal((await getNotifications(admin)).length, 0);
  await assert.rejects(
    run({ action: "status", postId, version: 1, status: "Shipped" }, pm),
    /record changed/,
  );
});
test("status cannot assign Duplicate without a merge target", async () => {
  await assert.rejects(
    run({ action: "status", postId, version: 1, status: "Duplicate" }, pm),
  );
  assert.equal(post().status, "Open");
});
test("official update creates notifications while note stays internal", async () => {
  await run({ action: "follow", postId, enabled: true });
  await run(
    { action: "official", postId, body: "We are investigating this." },
    pm,
  );
  await run({ action: "note", postId, body: "Private staff reasoning." }, pm);
  assert.equal(readDatabase().notifications.length, 1);
  assert.equal(
    (await getPostDetail(customer, "keyboard-shortcuts"))?.internalNotes.length,
    0,
  );
});
test("database write failure rolls back status audit and notifications", async () => {
  await run({ action: "follow", postId, enabled: true });
  const sql = new DatabaseSync(process.env.FEEDBACK_DATABASE_PATH!);
  sql.exec(
    "CREATE TRIGGER fail_write BEFORE UPDATE ON workspace BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  sql.close();
  await assert.rejects(
    run({ action: "status", postId, version: 1, status: "Planned" }, pm),
  );
  assert.equal(post().status, "Open");
  assert.equal(readDatabase().notifications.length, 0);
  assert.equal(readDatabase().moderationActions.length, 0);
});
test("notifications may only be marked read by their owner", async () => {
  await run({ action: "follow", postId, enabled: true });
  await run({ action: "official", postId, body: "A useful update." }, pm);
  const n = readDatabase().notifications[0];
  await assert.rejects(
    run({ action: "readNotification", notificationId: n.id }, admin),
    /unavailable/,
  );
  await run({ action: "readNotification", notificationId: n.id });
  assert.equal(readDatabase().notifications[0].isRead, true);
});
test("merge transfers deduplicated votes and follows while retaining comments", async () => {
  await create();
  const source = readDatabase().posts[0];
  for (const id of [source.id, postId]) {
    await run({ action: "vote", postId: id, enabled: true });
    await run({ action: "follow", postId: id, enabled: true });
  }
  await run({
    action: "comment",
    postId: source.id,
    body: "Original discussion",
  });
  await run(
    {
      action: "merge",
      sourcePostId: source.id,
      targetPostId: postId,
      sourceVersion: 1,
      targetVersion: 1,
    },
    moderator,
  );
  const db = readDatabase();
  assert.equal(db.votes.length, 1);
  assert.equal(db.votes[0].postId, postId);
  assert.equal(db.follows.length, 1);
  assert.equal(db.comments[0].postId, source.id);
  assert.equal(db.posts.find((p) => p.id === source.id)?.status, "Duplicate");
  assert.equal(db.mergeHistory.length, 1);
});
test("merge rejects missing, same, private and stale targets", async () => {
  await create();
  const source = readDatabase().posts[0];
  const cmd = {
    action: "merge",
    sourcePostId: source.id,
    targetPostId: postId,
    sourceVersion: 1,
    targetVersion: 1,
  };
  await assert.rejects(
    run({ ...cmd, targetPostId: "missing" }, moderator),
    /unavailable/,
  );
  await assert.rejects(
    run({ ...cmd, targetPostId: source.id }, moderator),
    /different/,
  );
  await assert.rejects(
    run({ ...cmd, targetPostId: "post-internal" }, moderator),
    /visibility/,
  );
  await assert.rejects(
    run({ ...cmd, targetVersion: 2 }, moderator),
    /record changed/,
  );
});
test("canonical targets with incoming duplicates cannot become duplicate chains", async () => {
  await create("First duplicate idea");
  const source = readDatabase().posts[0];
  await run(
    {
      action: "merge",
      sourcePostId: source.id,
      targetPostId: postId,
      sourceVersion: 1,
      targetVersion: 1,
    },
    moderator,
  );
  await create("Another canonical idea");
  const target = readDatabase().posts[0];
  await assert.rejects(
    run(
      {
        action: "merge",
        sourcePostId: postId,
        targetPostId: target.id,
        sourceVersion: 2,
        targetVersion: 1,
      },
      moderator,
    ),
    /canonical target/,
  );
});
test("board literal search and stable pagination cover all results", async () => {
  for (let i = 0; i < 24; i++) await create("Pagination idea " + i);
  const a = await getBoardHome(customer, { q: "Pagination", page: "1" }),
    b = await getBoardHome(customer, { q: "Pagination", page: "2" });
  assert.equal(a.total, 24);
  assert.equal(a.posts.length, 20);
  assert.equal(b.posts.length, 4);
  assert.equal(new Set([...a.posts, ...b.posts].map((p) => p.id)).size, 24);
  assert.equal((await getBoardHome(customer, { q: "%" })).total, 0);
});
test("independent processes serialize repeated vote writes", async () => {
  const worker = resolve("tests/worker.ts"),
    tsx = resolve("node_modules/tsx/dist/cli.mjs");
  await Promise.all(
    [0, 1].map(
      () =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [tsx, worker], {
            env: process.env,
            stdio: "pipe",
            windowsHide: true,
          });
          let error = "";
          child.stderr.on("data", (x) => (error += x));
          child.on("error", reject);
          child.on("exit", (code) =>
            code === 0 ? resolve() : reject(new Error(error)),
          );
        }),
    ),
  );
  assert.equal(readDatabase().votes.length, 1);
  assert.equal(readDatabase().revision, 21);
});
test("local setup generates parseable secrets and refuses a second run", () => {
  const setupRoot = join(root, "setup");
  require("node:fs").mkdirSync(setupRoot);
  const script = resolve("scripts/setup-local.ts"),
    tsx = resolve("node_modules/tsx/dist/cli.mjs");
  const first = spawnSync(process.execPath, [tsx, script], {
    cwd: setupRoot,
    encoding: "utf8",
  });
  assert.equal(first.status, 0, first.stderr);
  const env = readFileSync(join(setupRoot, ".env.local"), "utf8");
  assert.ok(env.includes("FEEDBACK_PASSWORD_HASHES='{"));
  assert.ok(!env.includes("\\n"));
  const before = readFileSync(
    join(setupRoot, "data/feedback-workspace.sqlite"),
  );
  const second = spawnSync(process.execPath, [tsx, script], {
    cwd: setupRoot,
    encoding: "utf8",
  });
  assert.notEqual(second.status, 0);
  assert.deepEqual(
    readFileSync(join(setupRoot, "data/feedback-workspace.sqlite")),
    before,
  );
});
