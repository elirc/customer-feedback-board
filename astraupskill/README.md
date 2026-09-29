# Start here: from feedback forms to reliable CRUD

This project teaches how a small web application becomes dependable when several people edit related records. The visible product is a feedback board. The engineering problem is coordinating identity, visibility, versions, discussion history, and durable writes. Begin by running the fictional workspace using [the root setup guide](../README.md). Sign in as the customer first, then repeat a workflow as a moderator and product manager. Keep the generated passwords local.

## Prerequisites

You should be comfortable with TypeScript and modern React (hooks, controlled inputs), and able to read an `async` function without stopping. You do **not** need prior knowledge of Next.js Server Actions, SQLite, Zod, optimistic concurrency or Playwright --- each is introduced here. If you have never seen a database transaction, read `02-CONCEPTS.md` twice rather than once; everything else rests on it.

## A practical study sequence

1. Read [the codebase map](01-CODEBASE-MAP.md), then trace one vote from its button to the committed database document. Spend your first session locating boundaries rather than memorizing every file.
2. Read [the concepts guide](02-CONCEPTS.md). Explain why a signed cookie does not grant permission to edit another person's idea. Identify the exact service check that decides authorship.
3. Follow [the worked change](03-WORKED-CHANGE.md) using two browser tabs. Make one accepted edit and one stale edit. Export the stale draft and compare the two versions before reloading.
4. Work through [testing and debugging](04-TESTING-AND-DEBUGGING.md). Reproduce a failed persistence write in a disposable fixture and prove that status, audit, and notification changes all roll back.
5. Complete [the practice tasks](05-PRACTICE.md), compare your design with [the review guidance](06-SOLUTIONS-AND-REVIEW.md), and finish [the trace lab](07-TRACE-LAB.md).

## What you should be able to explain

A junior implementation often knows how to insert a record and render it. Mid-level ownership includes deciding what happens when the record changes between reading and saving, when the current user's role changes, and when a response disappears after the write commits. For example, changing an idea from Open to Planned is not merely changing a string. It requires a product role, a matching post version, an audit entry, and notifications for followers who may see that post.

Write down the expected behavior before coding. A useful acceptance statement is: "A stale author edit returns a conflict, leaves the accepted title unchanged, and keeps the losing draft available." It names the trigger, persisted result, and user experience. Compare that with the vague statement "Handle errors." The stronger statement directly suggests a backend test and a two-tab browser scenario.

## Time budget

| Chapter | Time |
|---|---|
| [01 codebase map](01-CODEBASE-MAP.md) | 45 min |
| [02 concepts](02-CONCEPTS.md) | 60 min |
| [03 worked change](03-WORKED-CHANGE.md) | 60 min (two browser tabs) |
| [04 testing and debugging](04-TESTING-AND-DEBUGGING.md) | 60 min, plus one `npm run verify` run |
| [05 practice](05-PRACTICE.md) | exercise 1: one session; exercise 2: one to two; exercises 3-4: multi-day stretch |
| [06 solutions and review](06-SOLUTIONS-AND-REVIEW.md) | 40 min |
| [07 trace lab](07-TRACE-LAB.md) | 45 min |
| [VERIFICATION](VERIFICATION.md) | 20 min |

Plan on four sessions for chapters 01-04 and 07, then as much time as you want to give exercises 1 and 2.

## Glossary

- **Server Action** --- a function in a `"use server"` module that the browser can call directly as an RPC. It is a public endpoint: it must re-check identity and permissions, never trust its arguments.
- **Aggregate** --- here, the entire workspace document (posts, comments, votes, follows, settings, audits) stored as one validated JSON value. One write replaces the whole thing, which is what makes a multi-record change atomic.
- **Transaction / `BEGIN IMMEDIATE`** --- a block of database work that commits or rolls back as a unit. `IMMEDIATE` takes the write lock at the start rather than at the first write, so two processes cannot both read-then-write the same document.
- **Atomicity** --- "all of it or none of it". A status change, its audit entry and its follower notifications either all commit or all disappear.
- **Optimistic concurrency / captured version** --- the form remembers the `version` it read; the service compares it with the record's current version inside the transaction and rejects a stale save with 409. It is a *different* problem from atomicity: a transaction can commit perfectly and still overwrite someone else's work.
- **409 Conflict** --- the status this project uses to say "your copy is out of date"; the message tells the user to export their draft first.
- **Idempotency / desired state** --- a command that can be sent twice safely. `{enabled: true}` is desired state; "toggle" is not. Vote and follow are idempotent; creating a post or comment is not.
- **Projection** --- the shape of data returned to a particular viewer, with everything they may not see removed on the server (not hidden with CSS).
- **Visibility** --- whether an idea is public or internal; fixed after creation so that old discussion cannot retroactively become visible.
- **Audit entry** --- the durable record of who changed what, written in the same transaction as the change it describes.
- **Reference-aware delete** --- refusing to delete a record that other records point at, and hiding it instead.
- **Merge / canonical target** --- folding a duplicate idea into the idea it duplicates, moving votes and follows but leaving the original discussion where it was.
- **Revalidation (`revalidatePath`)** --- telling Next.js that cached pages are stale. It happens *after* the commit, and its failure must never make the user retry the write.
- **Fixture** --- a throwaway database created for one test run. `npm run verify` refuses to use your real workspace.

## Suggested checkpoints

After the first two sessions, draw the request path without opening the editor. After the worked change, describe which fields are browser-controlled and which are server-owned. After the testing session, distinguish transaction rollback from idempotent retry. At the end, prepare a short review containing a concrete problem, a small implementation, meaningful evidence, and an honest limitation.

The course does not ask you to turn every local demo into a distributed platform. The SQLite aggregate intentionally makes atomic business operations easy to inspect, while introducing a clear capacity and concurrency tradeoff. Use [the verification record](VERIFICATION.md) to understand what was actually exercised. Treat the older documentation as historical design material when its examples differ from the current source.
