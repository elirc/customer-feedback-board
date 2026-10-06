# Solution guidance and review questions

Use this guide after attempting [the practice tasks](05-PRACTICE.md). It gives the reasoning a reviewer should expect, rather than a block of code to copy without understanding the boundaries.

## Exercise 0: the version-check inventory

Eight calls in seven branches: `settings` (line 98), `merge` source and target (179-180), `moderate` (232), `editPost` (253), `deletePost` (277), the shared `editComment`/`deleteComment` branch (355) and `status` (415). Commands without a version are either desired state (vote, follow: sending `enabled: true` twice is harmless) or create a new record (create post, comment), where there is no earlier version to be stale against. The creates are exactly the commands exercise 3 is about: they are not stale-safe *and* not retry-safe.

## Exercise 5: the synchronous guard

The reference test in chapter 5 is the solution. The review point is the second assertion: `assert.throws` alone would pass even if the guard ran *after* the write; re-reading `revision` proves nothing committed.

## Empty states should preserve the cause

An empty filtered list and a forbidden guest view are different states. The service already tells you which one you are in (`src/modules/feedback/service.ts:493-498`):

```ts
return {
  posts,
  page,
  total: all.length,
  guestBlocked: !u && !db.settings.allowGuestBrowsing,
  categories: ...
};
```

So the view's decision is a two-line one --- `guestBlocked` means "sign in", an empty list with a query or status filter means "no matches, clear your filters", and an empty list with no filters means "nothing here yet, be the first". The page already renders the first two messages (`src/app/page.tsx:103-111`); exercise 1 adds the actions. Use that information directly. Do not infer permission from `posts.length === 0`, because an authenticated user can legitimately have no matches. A clear-filter action should remove the search and status filters and reset pagination. Review the URL as well as the displayed message.

## Draft import is a preview, not a remote command runner

A good importer parses a bounded file into a dedicated draft schema, displays the proposed editable values, and lets the user choose whether to apply them to a local form. It never calls the service as a side effect of reading the file. If the exported command contains a post ID or version, keep those visible in the preview and compare the target with the current editor.

Avoid silently rewriting a stale version to the current one. That would convert an unreviewed overwrite into an apparently valid save. The user must compare and reconcile content first. Exports do not contain session cookies, but they may contain the user's written text; explain that the file should be handled accordingly when sharing a debugging example.

## Retry-safe creation needs a durable identity

A useful receipt key includes the authenticated actor, operation, and client request ID. Store a fingerprint of the normalized input and the resulting comment identifier. Within the same transaction, check for an existing receipt before inserting anything. If it matches, return the earlier result; if the fingerprint differs, reject the conflicting reuse. The database's transaction boundary coordinates multiple processes.

A response can disappear after commit, so the client must retain the request key with the exact submitted payload. Editing the draft while retaining that key should either be prohibited or require an explicit new attempt. A disabled submit button addresses accidental clicks in one mounted form, but it is not durable idempotency. Review both the backend receipt and the browser's uncertain-response behavior.

## Relational storage should preserve business behavior

A table migration is successful only if the guarantees survive. A unique vote constraint should reject duplicates even when two processes race. A comment foreign key should point at a real post. A merge should validate two current records and update support pairs without losing discussion history. The expected-version predicate must remain part of the write, not disappear because transactions now update separate rows.

Retained audits deserve a deliberate deletion policy. A strict audit foreign key with cascading delete could erase the very history the application promises to preserve. Consider retained identifiers or archival rows and explain the tradeoff. Use the existing behavior tests against the new repository boundary, then add cases specific to migration counts, rollback, and invalid legacy input.

## Before requesting review

Describe one concrete before/after behavior, show the smallest relevant implementation, and report the evidence actually run. Mention any remaining limits such as receipt retention, manual conflict reconciliation, or lack of external delivery. A strong mid-level review makes it easy for another engineer to understand both the intended behavior and its practical boundary.
