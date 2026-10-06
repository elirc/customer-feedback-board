# Practice: small changes with increasing ownership

**Effort, before you pick one.** These are deliberately not the same size:

| Exercise | Scope | Realistic effort |
|---|---|---|
| 0 — version-check inventory | reading only | 30 minutes |
| 1 — empty-state actions | presentation, using a projection you already have | one session (1-2 hours) |
| 2 — reviewed draft import | a feature handling untrusted input, with tests | one to two sessions |
| 3 — retry-safe comment creation | durable idempotency receipts, fingerprint comparison, concurrency tests | **multi-day stretch task** |
| 4 — relational migration | schema design, constraints, indexes, a validated migration with a dry run | **multi-day stretch task** |
| 5 — pin the synchronous-transaction guard | one backend test | 30-60 minutes |

Do 0, 5, 1 and 2 first and finish them properly. Exercises 3 and 4 are mid-level-and-up work included so you can see where this kind of ownership leads; attempting them cold is the most common way to get stuck and learn nothing. It is entirely reasonable to *design* 3 and 4 on paper, write the acceptance criteria and the test list, and stop there.

Complete these exercises in a separate branch. Begin each with a user story and acceptance criteria. Keep the fictional data and generated local credentials separate from any personal workspace. Backend tests run with `npm test`; the full gate (backend, build, browser) with `npm run verify`.

## Exercise 0: find every version check

**Goal:** know exactly which commands are protected by optimistic concurrency, so you can say which ones are not.

Open [the service](../src/modules/feedback/service.ts). `expected(record, version)` is defined at line 41. Find every call, and for each one write down the command branch it belongs to and which record's version it checks.

**Hints:** search for `expected(`. One branch calls it twice. Then list the commands in [schemas.ts](../src/modules/feedback/schemas.ts) that carry **no** version at all, and explain for each why that is acceptable (for example: is it desired state, or does it create a new record?).

**Check:** there are eight calls, at lines 98, 179, 180, 232, 253, 277, 355 and 415. The pair at 179-180 is the merge command, which checks both the source (`sourceVersion`) and the target (`targetVersion`).

## Exercise 1: make the empty state actionable

**Goal:** the board already distinguishes its two empty states ([src/app/page.tsx:103-111](../src/app/page.tsx)): `guestBlocked` shows "Guest browsing is disabled. Sign in to browse.", and an empty list for anyone else shows "No ideas match these filters." The search box already keeps your query (`defaultValue`, line 72). What is missing is a way forward: add a **Clear filters** link when a query or status filter is active, and a **Submit an idea** link when the board is empty with no filters.

**Hints:**
- The permission decision stays in the service (`guestBlocked` in the projection, `service.ts:493-498`); the page only chooses wording.
- "Filters active" is readable from `params.q` and `params.status` in the page.
- Clearing filters is a plain link to `/`, which also drops any `page` parameter.

**Check (manual, `npm run dev`, port 3011):** search for `zzzz-no-match`: you see the no-match message and a Clear filters link; clicking it returns to `/` with the full list and an empty search box. Sign out, then as admin turn guest browsing off in Settings and visit `/` as a guest: you still see only the sign-in message, with no Clear filters link. A JSX snapshot test is not required for a change this small.

## Exercise 2: implement reviewed draft import

**Goal:** draft export already exists (`exportDraft` in [CommandForm](../src/components/command-form.tsx), line 94, writes `{ kind: "feedback-draft", values }`). Add an import that previews a file before anything is applied.

Requirements: bound the file size; reject anything that is not valid JSON with `kind: "feedback-draft"`; validate the values against the same command schema the form uses; show the target idea, the editable values and the captured version; apply them to the local form only after confirmation; never submit automatically and never accept an identity from the file. A draft for a different idea must be identified as such, not loaded into the current editor.

**Hints:** treat the file exactly like a request body: it is untrusted input. Keep the captured version from the file; do not "helpfully" replace it with the current one.

**Check:** tests (or documented manual runs) for malformed JSON, an unknown `kind`, an oversized file, a draft for a different post, and cancelling the preview each leave the form unchanged. Importing an old `editPost` draft fills the form only after confirmation, shows the old version, and saving it still produces the 409 conflict message ("This record changed. Export your draft, then load the current version.") until you reconcile it. Also answer in writing: could importing a `createPost` draft after an uncertain response create a duplicate idea?

## Exercise 3: make comment creation retry-safe (stretch)

**Goal:** a lost response after a committed `comment` command currently leaves the user unsure whether to resend, and resending creates a second comment (the `comment` command in `schemas.ts:36` has no request identity).

Add a client-generated request key to comment creation. Persist an idempotency receipt scoped to the authenticated user and operation. A matching key with the same normalized payload returns the original accepted result; the same key with different content returns a conflict. Create the comment, its audit and the receipt in one `transact` callback.

**Check:** tests for two concurrent identical requests (one comment), changed text under the same key (conflict, no second comment), the same key used by another user (independent), and a response "lost" after commit (the retry returns the original comment's id). Write down how long receipts are kept and what the UI does if it loses its key. Disabling the button alone does not pass: a second request can come from another tab.

## Exercise 4: design the relational migration (stretch)

**Goal:** replace the single document with tables while preserving the existing command API and every guarantee the current tests check.

Sketch posts, users, comments, votes, follows, settings, audits and merge history. Add unique constraints for user/post support pairs and foreign keys for relationships. Preserve audit identifiers after allowed deletions. Introduce indexes that match the board's filter and stable sort rather than indexing every field without evidence. Plan an explicit, validated migration into a new destination, with counts and a dry-run report, leaving the original JSON and SQLite sources unchanged.

**Check:** the existing backend tests, pointed at the new repository boundary, still pass, in particular `stale post edit does not overwrite accepted content`, `database write failure rolls back status audit and notifications` and `independent processes serialize repeated vote writes`. Your review explains how transaction scope, referential integrity, capacity and query cost changed.

## Exercise 5: pin the synchronous-transaction guard

**Goal:** `transact` rejects an `async` callback (`src/server/store.ts:45-46`), because a Promise would resolve after `COMMIT`. No test in [tests/workflow.test.ts](../tests/workflow.test.ts) covers that guard today (search the file for "synchronous": no match). Add one.

**Hints:** the file's `beforeEach` already creates a fixture database; `transact` and `readDatabase` are imported at the top. Record `readDatabase().revision` before the call.

```ts
test("async transaction callback is rejected and commits nothing", () => {
  const before = readDatabase().revision;
  assert.throws(() => transact(async () => undefined), /Transactions must be synchronous/);
  assert.equal(readDatabase().revision, before);
});
```

**Check:** the test passes with `npm test`. Then temporarily delete lines 45-46 of `store.ts` and run it again: it now fails, because `transact` commits and increments the revision. Restore the lines. This is the "red-first" step from chapter 4, turned into a permanent regression test.
