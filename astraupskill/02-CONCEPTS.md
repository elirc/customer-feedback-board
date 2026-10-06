# The engineering concepts behind the board

## Authentication, authorization, and visibility

Authentication answers who supplied a valid session. [Session credentials](../src/modules/auth/credentials.ts) sign a bounded, expiring payload with an application secret. A raw user ID is not a session. Authorization answers whether the current identity may perform a particular action. The service loads the current user inside the write transaction, so a previously supplied admin-shaped object cannot grant admin privileges.

Visibility is a third concern. Customers cannot read internal ideas, and hidden ideas disappear from public views. The same rule applies before voting, following, commenting, or flagging a record. Hiding a button is helpful presentation, but a client can call a server action without clicking that button. The service must enforce the rule independently. Internal notes and staff audit details are omitted from customer projections rather than merely hidden with CSS.

## Atomicity versus concurrency control

A status change writes the new state, an audit entry, and follower notifications. Atomicity means those changes commit together or none do. The SQLite store uses `BEGIN IMMEDIATE` and one document update. Here is the whole mechanism (`src/server/store.ts:38-58`) --- it is worth reading line by line, because everything else in this course depends on it:

```ts
export function transact<T>(change: (current: FeedbackDatabase) => T): T {
  const db = open();
  try {
    db.exec("BEGIN IMMEDIATE");
    const row = db.prepare("SELECT document FROM workspace WHERE id=1").get();
    const current = decode(row?.document);
    const result = change(current);
    if (result instanceof Promise)
      throw new Error("Transactions must be synchronous");
    if (current.revision >= 2147483646)
      throw new BoardError(409, "Database revision exhausted.");
    current.revision++;
    validateDatabase(current);
    const encoded = JSON.stringify(current);
    if (Buffer.byteLength(encoded) > MAX_BYTES)
      throw new BoardError(409, "Local database capacity reached. Export and archive before adding more data.");
    db.prepare("UPDATE workspace SET document=? WHERE id=1").run(encoded);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    db.close();
  }
}
```

Four things to notice. `BEGIN IMMEDIATE` takes the write lock *before* reading, so two processes cannot both read the same document and then both write. The callback is called with the decoded document and is required to be synchronous --- an `async` callback would return a Promise that resolves after `COMMIT`, which is exactly the bug the explicit `instanceof Promise` check prevents. `validateDatabase(current)` runs on the whole aggregate before it is written, so a command that leaves a dangling reference cannot commit. And the `catch` rolls back, which is why a failure in the middle of a status change leaves neither the status nor its audit nor its notifications behind. The injected-write-failure test proves precisely that.

Optimistic concurrency addresses a different problem. Alice and Bob can both read version 3 before either starts a transaction. Alice saves version 3 and creates version 4. Bob's later transaction must reject his expected version 3. Serializing database writes alone would not detect that Bob edited stale content. That is why the form retains the version it originally read and the service compares it with the current record. The comparison is five lines (`src/modules/feedback/service.ts:41-48`):

```ts
function expected(record: { version: number }, value: number) {
  insist(
    record.version === value,
    409,
    "This record changed. Export your draft, then load the current version.",
  );
  insist(record.version < 2147483646, 409, "Record version exhausted.");
}
```

and it is called eight times, from seven command branches, before they mutate (merge checks both its source and its target; exercise 0 has you find them all). In `editPost` (`service.ts:251-267`):

```ts
if (cmd.action === "editPost") {
  insist(p.authorId === u.id, 403, "Only the author may edit this idea.");
  expected(p, cmd.version);                       // 409 if someone saved since the form loaded
  insist(db.categories.some((x) => x.id === cmd.categoryId), 400, "Choose an existing category.");
  insist(cmd.visibility === p.visibility, 409, "Visibility is fixed after creation to preserve discussion privacy.");
  p.title = cmd.title;
  p.body = cmd.body;
  p.categoryId = cmd.categoryId;
  touch(p);                                       // version++ and timestamps, only after every guard passed
  audit(db, u, p.id, "post.edited", "Idea content edited.");
  return { message: "Idea saved." };
}
```

`expected` runs *inside* the transaction, on the record as it exists at that moment --- not on the copy the page rendered. That is the difference between checking a version and merely displaying one. Note the error message, too: it tells the loser what to do with the work they are about to lose, which is the part most implementations forget.

## Desired state versus a toggle

A command saying `enabled: true` is naturally repeatable. Sending it twice should leave one vote. A command saying "toggle" twice would add and then remove the vote, even if the second request was an accidental retry. The vote and follow operations use desired state plus a unique user/post pair. This is operation-level idempotency. It does not make post creation or comment creation idempotent; those operations still require checking the current records after an uncertain response.

## References and historical truth

An unused open idea can be deleted. Once it has discussion, support, or moderation references, deletion is rejected and hiding becomes the appropriate workflow. A merge retains the original source discussion while moving votes and follows to a canonical target. Matching visibility and preventing duplicate chains keep that relationship understandable. Visibility stays fixed after creation, preventing old notifications or discussions from becoming a privacy trap after a later edit.

## A deliberate storage tradeoff

A single validated JSON aggregate inside SQLite is easy to transact and inspect, but every write validates and serializes the whole workspace. Collections are capped at 10,000 records and the document at 16 MiB. This is suitable for studying a small local board, not a claim of unlimited scale. A relational migration should preserve the same business invariants while introducing tables, foreign keys, indexes, and narrower transactions. Explain that tradeoff before proposing infrastructure changes.
