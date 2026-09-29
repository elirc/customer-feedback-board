# Practice: small changes with increasing ownership

**Effort, before you pick one.** These four are deliberately not the same size:

| Exercise | Scope | Realistic effort |
|---|---|---|
| 1 — empty-state suggestion | presentation + one service projection you already have | one session (1-2 hours) |
| 2 — reviewed draft import | a feature handling untrusted input, with tests | one to two sessions |
| 3 — retry-safe comment creation | distributed-systems work: durable idempotency receipts, fingerprint comparison, concurrency tests | **multi-day stretch task** |
| 4 — relational migration | architecture: schema design, constraints, indexes, a validated migration with a dry run | **multi-day stretch task** |

Do 1 and 2 first and finish them properly. Exercises 3 and 4 are mid-level-and-up work included so you can see where this kind of ownership leads; attempting them cold, before 1 and 2, is the most common way to get stuck and learn nothing. It is entirely reasonable to *design* 3 and 4 on paper, write the acceptance criteria and the test list, and stop there.

Complete these exercises in a separate branch or copy. Begin each with a user story and acceptance criteria. Keep the fictional data and generated local credentials separate from any personal workspace. The goal is to make a change you can explain and review, including its failure cases.

## Exercise 1: add a clear empty-state suggestion

When a search has no matching ideas, help the user adjust the search or submit an idea. Preserve the current query in the search field and distinguish a filtered empty result from guest browsing being disabled. Read [the board page](../src/app/page.tsx) and its projection in the service. Keep the permission rule in the service; the view should only choose appropriate wording.

Acceptance example: searching for a nonexistent phrase shows an empty result message and an action to clear filters, while a blocked guest sees a sign-in instruction. Verify both cases manually in the browser. This small presentation change does not require an elaborate new test suite that simply repeats the JSX.

## Exercise 2: implement reviewed draft import

Draft export already saves the command values. Add an import preview that treats the file as untrusted input. Bound the file size, validate its kind and fields, and show the intended idea, editable values, and captured version before applying anything. Never automatically submit an imported command or accept its user identity. A draft from a different idea should be clearly identified rather than quietly loaded into the current editor.

Test malformed JSON, unknown command types, oversized files, a draft with an old version, and cancellation of the preview. Acceptance example: importing an old edit fills a draft only after confirmation, keeps the old version visible, and still conflicts until the user deliberately reconciles it with current content. Consider whether importing a create command after an uncertain earlier response could duplicate an idea.

## Exercise 3: make comment creation retry-safe

Add a client-generated request key to comment creation. Persist an idempotency receipt scoped to the authenticated user and operation. A matching key with the same normalized payload returns the original accepted result. The same key with different content returns a conflict. Create the comment, audit, and receipt in one transaction.

Test two concurrent identical requests, changed text under the same key, the same key used by another user, and a response lost after commit. Decide how long receipts remain available and what the UI should do if it loses its key. Do not implement this by disabling the button alone: a second request can come from another tab or a network retry.

## Exercise 4: design the relational migration

Replace the single document with tables while preserving the existing command API. Sketch posts, users, comments, votes, follows, settings, audits, and merge history. Add unique constraints for user/post support pairs and foreign keys for relationships. Preserve audit identifiers after allowed deletions. Introduce indexes that match the board's filter and stable sort rather than indexing every field without evidence.

Plan an explicit, validated migration into a new destination, with counts and a dry-run report. Leave the original JSON and SQLite sources unchanged. Compare rollback and stale-edit behavior before and after the migration. Your final review should explain how transaction scope, referential integrity, capacity, and query cost changed, plus what operational questions remain unanswered.
