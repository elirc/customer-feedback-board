# Worked change: protect an author's edit from stale overwrites

The user story is concrete: "As an idea author, I can update my title and description without silently overwriting a newer edit." The acceptance criteria include both the database and the browser. Only the author may edit. The category must exist. Visibility and the public URL remain stable. A stale edit must keep its draft and explain how to recover.

## Step 1: define the command boundary

Open [the command schemas](../src/modules/feedback/schemas.ts) and find `editPost`. A request has the following shape:

```ts
{
  action: "editPost",
  postId: "post-keyboard",
  version: 1,
  title: "Keyboard shortcuts for the board",
  body: "Let us navigate common actions using the keyboard.",
  categoryId: "category-accessibility",
  visibility: "public"
}
```

The version is the value the editor read. Do not replace it with a freshly fetched version just before saving: doing so would approve an overwrite the user never reviewed. The strict schema rejects extra fields such as `authorId`. Trimming and length validation happen before the mutation begins, while relational checks such as category existence happen against the transaction's current data.

## Step 2: perform policy and mutation together

In [the service](../src/modules/feedback/service.ts), the transaction reloads the actor and finds a visible, writable post. It checks authorship and the captured version before assigning title, body, and category. It rejects a visibility change. `touch` increments the version and records update times; `audit` records that an edit occurred. The slug remains unchanged so links to the idea continue to work.

Observe the order of operations. If authorship fails, no content is assigned. If the version is stale, no version increment or audit occurs. If the final database update fails, SQLite rolls back the entire document. The service returns success only after commit, so the UI has a meaningful acceptance boundary.

## Step 3: preserve the losing editor

[PostEditor](../src/components/post-editor.tsx) provides editable fields and the original version to [CommandForm](../src/components/command-form.tsx). The latter holds a draft independently from refreshed server props while dirty. Open the seeded keyboard idea in two tabs. Change both titles, save the first, then save the second. The second form should show a conflict and retain its alternate title.

Export that draft before choosing Load current. Compare the exported title with the accepted title, then decide which changes to reapply manually. There is no automatic merge. This makes the user's decision explicit and avoids pretending that an overwrite is conflict resolution.

## Step 4: review the evidence

The backend test proves that the accepted title remains unchanged after the stale request. The browser test proves that the losing text remains visible and can be exported. Both are necessary: a correct database conflict with a wiped form still produces a poor editing experience. In your review, name the captured-version rule, the authorization rule, and the user recovery path separately.
