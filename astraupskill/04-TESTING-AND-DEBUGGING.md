# Test the guarantees and debug the boundary that failed

Run [the verification helper](../scripts/verify.ts) through `npm run verify`. It creates a unique temporary SQLite fixture, generates test-only session material, runs the backend tests and build, starts a loopback production server, and executes Chromium scenarios. It does not point the tests at your normal workspace database. The browser configuration refuses to run without the helper's fixture marker.

## Read a test as a small specification

Start with the stale-edit test in [workflow.test.ts](../tests/workflow.test.ts), lines 258-272. It is fifteen lines and it is a complete specification:

```ts
test("stale post edit does not overwrite accepted content", async () => {
  const p = post(),
    cmd = {
      action: "editPost", postId, version: 1,
      title: "First accepted title",
      body: p.body, categoryId: p.categoryId, visibility: p.visibility,
    };
  await run(cmd);
  await assert.rejects(run({ ...cmd, title: "Stale title" }), /record changed/);
  assert.equal(post().title, "First accepted title");
});
```

Arrange a known idea at version 1. Save one title using version 1 --- accepted, and the record becomes version 2. Attempt another title with the *same* old version. The last two lines are the point: assert that the second operation rejects **and** that the first title is still stored. Merely asserting an error misses accidental writes performed before the error was thrown, which is the most common way a "conflict is handled" claim turns out to be false.

Two habits to copy from it. The second command is built with `{ ...cmd, title: "Stale title" }`, so the only difference between the accepted and rejected calls is the one field under test. And the final assertion re-reads through `post()` rather than trusting the value the service returned.

Next inspect the injected database failure. A SQLite trigger aborts the aggregate update after the in-memory service has prepared a status change, audit, and notifications. The test then reads the database independently and checks that none committed. This tests the atomic boundary, not just the shape of a helper function's return value.

The cross-process test starts two separate Node processes. Both repeatedly request a vote to be enabled for the same user and idea. The final state contains one vote and all transaction revisions are accounted for. An in-memory Promise queue cannot coordinate those processes, which is why this scenario is stronger than calling the same function twice sequentially in one test process.

## Red-first: break it on purpose

Before you believe any of the guarantees above, spend ten minutes making them fail. This project ships no `.before` snapshots, so use the code itself:

1. In `src/modules/feedback/service.ts:253`, comment out `expected(p, cmd.version);` inside the `editPost` branch. Run `npm test`. Predict first: which tests fail? You should see the stale-edit test fail on its *second* assertion --- the reject no longer happens --- and that is precisely the assertion that distinguishes "returns an error" from "protects the data".
2. Put it back, and instead change `db.exec("BEGIN IMMEDIATE")` in `src/server/store.ts:41` to `db.exec("BEGIN")`. Run the cross-process test. A deferred transaction takes its lock later, so the two workers can interleave their reads.
3. Remove the `if (result instanceof Promise) throw ...` guard and make one command branch `async`. Predict what happens to the revision. Exercise 5 in chapter 5 turns this experiment into a permanent test, since no existing test covers the guard.

Restore each change before moving on, and write down what failed and what the message was. A guarantee you have never seen fail is a guarantee you are taking on trust.

## A useful debugging sequence

When a save fails, first identify whether the response is a validation problem, permission failure, conflict, or unconfirmed server error. Keep the draft. Compare its captured version with the current record in an isolated fixture. If permission failed, inspect the database user's current role and the post's visibility; do not assume that a visible button establishes permission.

If data appears partially changed, inspect the transaction boundary. Related writes should occur inside one callback, with no asynchronous work that escapes the transaction. The store rejects a Promise returned by a transaction callback. Avoid adding an external email call inside that callback: a network response cannot be rolled back by SQLite. Instead, a future delivery worker would consume durable jobs written with the business change.

If a browser assertion fails, inspect the retained trace and the page's accessible labels. Do not loosen a test merely to make it pass. A draft can remain in state while the DOM points at the wrong form, or a successful write can be followed by a failed refresh. Distinguish those cases before changing application logic.

## Evidence boundaries

A passing typecheck catches invalid TypeScript relationships, not authorization mistakes. A successful build proves compilation and bundling, not transaction correctness. Browser screenshots help assess layout but do not certify all keyboard or screen-reader behavior. The [verification record](VERIFICATION.md) combines actual results with these limits so you can make an evidence-based review.
