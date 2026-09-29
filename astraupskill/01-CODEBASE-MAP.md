# Read the code in the order a decision travels

Start with [the detail page](../src/app/post/[slug]/page.tsx). It obtains the current session user, asks the service for an authorized projection, and renders public discussion separately from staff controls. It does not open the database itself or decide that a submitted role is trustworthy. The detail page is a useful map because one idea connects posts, comments, votes, follows, updates, and moderation.

Next open [CommandForm](../src/components/command-form.tsx). The form keeps field values in state and sends a command to a server action. Its initial values include a captured version when the operation edits an existing record. A dirty form does not replace those values merely because another server refresh arrives. Notice the separate `dirty`, `busy`, and feedback state: unsaved input, a pending request, and the result of a request describe different things.

The [server action](../src/modules/feedback/actions.ts) is the transport adapter. It finds the session user, calls the service, and translates expected errors into a controlled result. The ordering is the whole lesson (`src/modules/feedback/actions.ts:1-28`):

```ts
"use server";
import { revalidatePath } from "next/cache";
// ...
export async function saveFeedback(raw: unknown): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return { ok: false, message: "Session expired. Export your draft before signing in again." };
    const result = await executeCommand(user, raw);
    // The write is already committed. Cache refresh failure must not invite another create.
    try {
      revalidatePath("/", "layout");
    } catch {
      return { ok: true, ...result,
        message: result.message + " Refresh failed; reload to see the accepted change." };
    }
    return { ok: true, ...result };
  } catch (error) {
```

`"use server"` marks the whole module as server-only, so this function is reachable from the browser as an RPC endpoint --- which is why it re-resolves the session rather than trusting anything the form sent. The write happens first; cache invalidation happens after the mutation returns; and if that refresh fails, the code still reports `ok: true`, because the change *is* committed and telling the user otherwise would invite a duplicate create.

Be honest with yourself about the mechanism, though: `revalidatePath` in the App Router is synchronous cache-tag bookkeeping and will rarely, if ever, throw. The `try/catch` here is a deliberately visible model of a general rule --- **a side effect that runs after the commit must never cause the user to retry the write** --- rather than a guard against a failure mode you should expect to see in your logs. The same rule applies with real teeth to the things you will do after a commit in other systems: sending an email, enqueueing a job, calling a payment provider's confirmation endpoint.

The [command schema](../src/modules/feedback/schemas.ts) defines exactly what each operation accepts. `editPost` accepts editable content and an expected version; it does not accept a replacement author, arbitrary status, or a whole database record. Compare it with `status`, which requires a different policy and deliberately excludes Duplicate. Duplicate state can only be produced by the merge operation with a real target.

The [service](../src/modules/feedback/service.ts) owns business rules. Locate `actor`, `visible`, `expected`, `audit`, and `notify` before reading the command branches. `actor` reloads the identity from the transaction's current database. `expected` checks the version. `notify` includes only followers allowed to see the post. These helpers describe reusable policy, but the command branch still makes its operation-specific checks explicit.

Finally, read [the SQLite store](../src/server/store.ts) and [aggregate validator](../src/modules/feedback/database-schema.ts). The store begins an immediate transaction, decodes the current document, applies one synchronous callback, validates all references, writes once, and commits. Exceptions roll back. The validator is runtime code, unlike TypeScript types, so malformed stored content cannot silently become a trusted object.

## Supporting routes and tools

The board and roadmap use a filtered, stable, 20-record projection. The settings page sends a versioned admin command. The moderation page chooses a source and canonical target; discussion stays on its original source after merging. Notifications are scoped to their owner and can be marked read. [Setup](../scripts/setup-local.ts) generates a separate fictional database and local credentials; it never imports the original JSON file implicitly.

Use [the workflow tests](../tests/workflow.test.ts) as an executable index of guarantees. When a helper feels abstract, find the corresponding failure case. For example, compare the cross-process test with the retired process-local queue, described below and listed in the historical [build journal](../docs/learning/build-journal.md) alongside the other retired files. This connects code organization to a behavior that matters.

## What the SQLite store replaced

`src/server/json-store.ts` is still in the tree, but it is now a three-line tombstone: "Historical module retained so older documentation links still resolve." The implementation it used to hold is the "before" this course keeps describing in prose, so here it is:

```ts
// the RETIRED implementation
const writeQueue = new Map<string, Promise<void>>();

export async function updateJsonFile<T>(relativePath: string, updater: (current: T) => Promise<T> | T) {
  const filePath = resolveFile(relativePath);
  const previous = writeQueue.get(filePath) ?? Promise.resolve();

  const next = previous.then(async () => {
    const current = await readJsonFile<T>(relativePath);   // read
    const updated = await updater(current);                // change
    await writeJsonFile(relativePath, updated);            // write
  });

  writeQueue.set(filePath, next.catch(() => undefined));
  await next;
}
```

It looks careful --- there is a queue, and writes for one file really are serialized. Three things are wrong with it, and each maps to something the current store does:

1. **The queue is a `Map` in one process's memory.** A second Node process (`next dev` and a test runner, or two server instances) has its own empty `Map` and knows nothing about the first one's lock. `BEGIN IMMEDIATE` moves that lock into the database, where every process sees it. This is exactly what `tests/worker.ts` demonstrates by racing two *processes*, not two promises.
2. **`writeJsonFile` is a plain `fs.writeFile` of the whole document.** A crash or a full disk midway leaves a truncated, unparseable file --- and the previous good content is already gone. A SQLite `COMMIT` is atomic: the old document stays readable until the new one is durable.
3. **Nothing validates what is written.** `updater` returns `T` and it is written, so a command that leaves a comment pointing at a deleted post persists happily. The current store calls `validateDatabase(current)` before the write, so that document never reaches disk.

Read those three points next to `transact()` in `02-CONCEPTS.md` and the whole change becomes one idea: move the guarantees out of your process and into the store.
