# Customer Feedback Board

A local Next.js application for practicing CRUD development around public ideas, discussion, product decisions, and staff moderation. Start with [the learning path](astraupskill/README.md) for a detailed junior-to-mid-level walkthrough.

## Run locally

Use Node 22.16 or newer. This implementation uses Node's built-in SQLite module, which emits an experimental-feature warning on the verified Node 22.16 runtime.

```powershell
npm.cmd ci
npm.cmd run setup:local
npm.cmd run dev
```

Open `http://127.0.0.1:3011`. Setup creates `.env.local`, `.local-credentials.txt`, and `data/feedback-workspace.sqlite`. Read the local credentials file to choose an account and enter its generated password. Secret values are not printed by setup. All three targets must be absent; setup refuses to overwrite any existing target. Existing `data/feedback-db.json` stays unchanged and is not automatically imported. The new database contains two fictional ideas and four fictional users.

Use `npm` instead of `npm.cmd` on shells without Windows PowerShell's script-execution restriction. Do not run setup to reset an existing workspace: retain its files and use a separate checkout or a deliberate backup/restore procedure. A failed initialization may leave its newly created database as a diagnostic artifact; inspect it before choosing a new empty workspace.

## Everyday workflows

Customers browse public ideas, create and edit their own ideas, delete unused open ideas, vote, follow, comment, edit their own comments, and flag duplicates. A post with discussion or other references cannot be hard-deleted. Visibility is fixed at creation to preserve discussion privacy.

Moderators can hide or restore posts, lock comments, resolve flags, delete comments with an audit trail, and merge duplicate ideas. Merging moves and deduplicates votes and follows; discussion remains on the original read-only source. Matching visibility, current versions, and canonical-target rules prevent private-to-public merges and duplicate chains. The merge has no undo UI.

Product managers additionally publish official updates, add internal notes, and change roadmap status. Followers receive in-app notifications in the same transaction as a status change or official update. Customers never receive internal notes or staff audit details. Admins additionally edit guest browsing, voting, and portal mode. Public mode prevents new internal ideas; it does not expose existing internal content.

## What to study

The service validates a strict command, reloads the acting user from the database, enforces policy, checks captured record versions, and updates one validated aggregate inside `BEGIN IMMEDIATE`. SQLite coordinates independent processes; the old process-local JSON write queue is retired. The aggregate is limited to 16 MiB and 10,000 records per collection. This is a deliberate small-workspace model, with a relational migration exercise in the course.

Client forms retain field values and versions on validation or conflict errors. Export a draft before loading current values. Navigation and sign-out prompt when forms have unsaved work. Drafts stay in browser memory; there is no automatic import or recovery after a tab closes. Creates and comments do not have durable idempotency keys: after a lost response, inspect current records before retrying.

## Verify

```powershell
npm.cmd run typecheck
npm.cmd test
node node_modules/@playwright/test/cli.js install chromium
npm.cmd run verify
```

`verify` runs backend tests, TypeScript, the production build, and Chromium scenarios against a temporary helper-owned SQLite database. It starts a local production server on port 3011, so stop your development server first. Logs and JSON results are written to `.verification`. Set `FEEDBACK_VERIFY_RESULTS_DIR` to keep evidence elsewhere. `npm run test:browser` deliberately requires the helper's fixture marker; use `verify` for a safe complete run. See [verification boundaries](astraupskill/VERIFICATION.md) for the actual results and limits.

## Scope and limits

This is one local board, with generated local credentials and signed 30-minute HttpOnly cookies. Roles are rechecked inside each mutation transaction. There are no live identity providers, password reset, MFA, server-side session revocation, external mail, invitations, tenant isolation, or deployment configuration. The account-based throttle is process-local. Enable secure cookies only behind HTTPS using `FEEDBACK_COOKIE_SECURE=true`; the default listener is loopback HTTP.

The original documentation remains useful historical context. Its old JSON persistence, identity-picker authentication, and mutation examples have been superseded by the source-linked `astraupskill` course. No existing collection data was migrated or replaced. Browser checks and screenshots cover desktop and narrow layouts, without claiming a comprehensive accessibility or production reliability certification.
