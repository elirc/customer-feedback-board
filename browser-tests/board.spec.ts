import { test, expect } from "@playwright/test";
import { signSession } from "../src/modules/auth/credentials";
import { readDatabase, transact } from "../src/server/store";
import { fictionalSeed } from "../src/server/seed";
import { executeCommand } from "../src/modules/feedback/service";
import { demoUsers } from "../src/modules/auth/demo-users";
import { mkdirSync } from "node:fs";
const [customer, moderator, pm, admin] = demoUsers;
const postId = "post-keyboard";
async function session(context: any, user = customer) {
  await context.addCookies([
    {
      name: "feedback_session",
      value: signSession(user.id),
      url: "http://127.0.0.1:3011",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}
const form = (page: any, label: string) =>
  page.getByRole("form", { name: label, exact: true });
async function create(page: any, title = "A browser-created idea") {
  await page.goto("/new");
  await page.getByLabel("Idea title", { exact: true }).fill(title);
  await page
    .getByLabel("Idea description", { exact: true })
    .fill("Explain a concrete problem from everyday work.");
  await form(page, "Submit idea")
    .getByRole("button", { name: "Submit idea", exact: true })
    .click();
  await expect(page).toHaveURL(/\/post\//);
}
test.beforeEach(() => {
  transact((db) => Object.assign(db, fictionalSeed()));
});
test("generated account sign-in sets signed HttpOnly cookie and sign-out clears it", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-browser-password-123");
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3011/");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "feedback_session",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.value).not.toBe(customer.id);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect
    .poll(async () =>
      (await context.cookies()).some((c) => c.name === "feedback_session"),
    )
    .toBe(false);
});
test("plain old identity cookie cannot grant staff access", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "feedback_demo_user",
      value: admin.id,
      url: "http://127.0.0.1:3011",
    },
  ]);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
});
test("customer views hide private posts and staff controls", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/");
  await expect(page.getByText("Internal triage meeting notes")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Settings", exact: true }),
  ).toHaveCount(0);
  await page.goto("/post/keyboard-shortcuts");
  await expect(
    page.getByRole("heading", { name: "Moderation", exact: true }),
  ).toHaveCount(0);
});
test("create edit and delete an unused idea with confirmation", async ({
  page,
  context,
}) => {
  await session(context);
  await create(page);
  const edit = form(page, "Save idea");
  await edit.getByLabel("Idea title").fill("A revised browser idea");
  await edit.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A revised browser idea", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Delete unused idea" }).click();
  await expect(
    page.getByRole("heading", { name: "A revised browser idea", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete unused idea" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3011/");
});
test("two editor versions conflict without losing the second draft", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/post/keyboard-shortcuts");
  const second = await context.newPage();
  await second.goto("/post/keyboard-shortcuts");
  const a = form(page, "Save idea"),
    b = form(second, "Save idea");
  await b.getByLabel("Idea title").fill("My unsaved alternate title");
  await a.getByLabel("Idea title").fill("The accepted title");
  await a.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The accepted title", exact: true }),
  ).toBeVisible();
  await b.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(b.getByRole("alert")).toContainText("record changed");
  await expect(b.getByLabel("Idea title")).toHaveValue(
    "My unsaved alternate title",
  );
  const download = second.waitForEvent("download");
  await b.getByRole("button", { name: "Export draft" }).click();
  expect((await download).suggestedFilename()).toBe("feedback-draft.json");
  await second.close();
});
test("server validation retains invalid whitespace draft", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/new");
  await page.getByLabel("Idea title", { exact: true }).fill("    ");
  await page
    .getByLabel("Idea description", { exact: true })
    .fill("A useful description for the form.");
  await form(page, "Submit idea")
    .getByRole("button", { name: "Submit idea", exact: true })
    .click();
  await expect(form(page, "Submit idea").getByRole("alert")).toContainText(
    "title",
  );
  await expect(
    page.getByLabel("Idea description", { exact: true }),
  ).toHaveValue("A useful description for the form.");
});
test("vote and follow controls apply desired state", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/post/keyboard-shortcuts");
  await page.getByRole("button", { name: "Vote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove vote", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unfollow", exact: true }),
  ).toBeVisible();
  expect(readDatabase().votes.length).toBe(1);
  expect(readDatabase().follows.length).toBe(1);
});
test("comment create edit delete works and retains history protection", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/post/keyboard-shortcuts");
  const add = form(page, "Add comment");
  await add.getByLabel("Add comment").fill("My useful comment");
  await add.getByRole("button", { name: "Add comment", exact: true }).click();
  await expect(
    page.getByText("My useful comment", { exact: true }),
  ).toBeVisible();
  await page.getByText("Edit your comment", { exact: true }).click();
  const edit = form(page, "Save comment");
  await edit.getByLabel("Comment text").fill("My edited comment");
  await edit.getByRole("button", { name: "Save comment", exact: true }).click();
  await expect(edit.getByRole("status")).toContainText("Comment saved");
  await expect(
    page.locator(".comment-card > p").filter({ hasText: "My edited comment" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete comment", exact: true })
    .click();
  await expect(
    page.getByText("My edited comment", { exact: true }),
  ).toHaveCount(0);
  expect(
    readDatabase().moderationActions.some(
      (x) => x.actionType === "comment.deleted",
    ),
  ).toBe(true);
});
test("post with discussion rejects deletion without losing the record", async ({
  page,
  context,
}) => {
  await executeCommand(customer, {
    action: "comment",
    postId,
    body: "Retained discussion",
  });
  await session(context);
  await page.goto("/post/keyboard-shortcuts");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete unused idea" }).click();
  await expect(
    form(page, "Delete unused idea").getByRole("alert"),
  ).toContainText("discussion or history");
  expect(readDatabase().posts.some((x) => x.id === postId)).toBe(true);
});
test("PM status and update create scoped in-app notifications", async ({
  page,
  context,
}) => {
  await executeCommand(customer, { action: "follow", postId, enabled: true });
  await session(context, pm);
  await page.goto("/post/keyboard-shortcuts");
  const status = form(page, "Save status");
  await status.getByLabel("Status", { exact: true }).selectOption("Planned");
  await status
    .getByRole("button", { name: "Save status", exact: true })
    .click();
  await expect(status.getByRole("status")).toContainText("Status saved");
  const update = form(page, "Publish update");
  await update
    .getByLabel("Official response")
    .fill("We have accepted this for planning.");
  await update.getByRole("button", { name: "Publish update" }).click();
  await expect(update.getByRole("status")).toContainText("published");
  expect(readDatabase().notifications.length).toBe(2);
  await session(context, customer);
  await page.goto("/notifications");
  await expect(
    page.getByText("We have accepted this for planning.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark read", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("marked read");
});
test("staff moderation hides and restores a post", async ({
  page,
  context,
}) => {
  await session(context, moderator);
  await page.goto("/post/keyboard-shortcuts");
  const moderation = form(page, "Save moderation");
  await moderation.getByLabel("Hide from public board").check();
  await moderation.getByRole("button", { name: "Save moderation" }).click();
  await expect(
    page.getByText("Hidden from the public board.", { exact: true }),
  ).toBeVisible();
  await moderation.getByLabel("Hide from public board").uncheck();
  await moderation.getByRole("button", { name: "Save moderation" }).click();
  await expect(
    page.getByText("Hidden from the public board.", { exact: true }),
  ).toHaveCount(0);
});
test("admin settings affect a separate guest session", async ({
  page,
  context,
  browser,
}) => {
  await session(context, admin);
  await page.goto("/settings");
  await page.getByLabel("Allow guest browsing").uncheck();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved");
  const guest = await browser.newPage();
  await guest.goto("http://127.0.0.1:3011/");
  await expect(
    guest.getByText("Guest browsing is disabled.", { exact: false }),
  ).toBeVisible();
  await guest.close();
});
test("duplicate merge transfers support and retains the source page", async ({
  page,
  context,
}) => {
  await executeCommand(customer, {
    action: "createPost",
    title: "Another keyboard request",
    body: "A second report of the keyboard problem.",
    categoryId: "category-accessibility",
    visibility: "public",
  });
  const source = readDatabase().posts[0];
  await executeCommand(customer, {
    action: "vote",
    postId: source.id,
    enabled: true,
  });
  await session(context, moderator);
  await page.goto("/moderation");
  await page.getByLabel("Source duplicate").selectOption(source.id);
  await page.getByLabel("Canonical idea").selectOption(postId);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Merge duplicate", exact: true })
    .click();
  await expect.poll(() => readDatabase().mergeHistory.length).toBe(1);
  await page.goto("/post/" + source.slug);
  await expect(
    page.getByRole("link", { name: "View the canonical idea" }),
  ).toBeVisible();
  expect(readDatabase().votes[0].postId).toBe(postId);
});
test("navigation and sign-out ask before discarding an unsaved draft", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/new");
  await page
    .getByLabel("Idea title", { exact: true })
    .fill("Unfinished idea draft");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("link", { name: "Board", exact: true }).click();
  await expect(page).toHaveURL(/\/new$/);
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Idea title", { exact: true })).toHaveValue(
    "Unfinished idea draft",
  );
});
test("expired session returns a recoverable save error", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/new");
  await page
    .getByLabel("Idea title", { exact: true })
    .fill("Retain this idea draft");
  await page
    .getByLabel("Idea description", { exact: true })
    .fill("A full description that must remain available.");
  await context.clearCookies();
  await form(page, "Submit idea")
    .getByRole("button", { name: "Submit idea", exact: true })
    .click();
  await expect(form(page, "Submit idea").getByRole("alert")).toContainText(
    "Session expired",
  );
  await expect(page.getByLabel("Idea title", { exact: true })).toHaveValue(
    "Retain this idea draft",
  );
});
test("desktop and narrow views remain readable without page overflow", async ({
  page,
  context,
}) => {
  await session(context);
  mkdirSync("astraupskill/images", { recursive: true });
  for (const [name, width] of [
    ["desktop", 1440],
    ["narrow", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "What should we build next?" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `astraupskill/images/${name}.png`,
      fullPage: true,
    });
    await page.goto("/post/keyboard-shortcuts");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `astraupskill/images/detail-${name}.png`,
      fullPage: true,
    });
  }
});
