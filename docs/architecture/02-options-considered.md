# Options Considered

## FB-ADR-001

## Stage

Project/app structure

## Why this matters

This decision determines whether the feedback platform remains a coherent product with its own public/private concerns, moderation flows, and roadmap communication patterns, or whether it gets tangled with the very different CRM domain.

## Options considered

### Option A: Single shared app serving both products
- What it is: one application containing both the CRM and feedback platform.
- Strengths: shared runtime and less duplicated setup.
- Weaknesses: public-facing and internal business flows get mixed, product language collides, and permissions become harder to reason about.
- Future pain points: features from one product pressure the abstractions of the other.
- When a team would choose it: when both are modules of the same platform with deliberate shared identity and data layers.

### Option B: Separate project folders, each as a standalone modular monolith
- What it is: each product gets its own folder, docs, and future implementation stack.
- Strengths: clear product isolation, easier study/review, fewer accidental abstractions, and simpler prompts for AI-assisted work.
- Weaknesses: some repeated setup later.
- Future pain points: any shared utilities must be intentionally extracted.
- When a team would choose it: when products are distinct enough that clarity matters more than early reuse.

### Option C: Monorepo packages with shared infrastructure from day one
- What it is: two apps plus shared packages for UI, auth, and utilities immediately.
- Strengths: can work if stable shared conventions are already known.
- Weaknesses: encourages generic abstractions before the products prove what is truly shared.
- Future pain points: hard-to-change shared packages that grow around guessed reuse.
- When a team would choose it: mature multi-product teams with established platform conventions.

## Recommendation

Choose **Option B: Separate project folders, each as a standalone modular monolith**.

Why:

- The feedback platform has a very different domain model and UI character than the CRM.
- Public browsing, moderation, and roadmap communication will benefit from focused naming and module boundaries.
- It produces cleaner docs, cleaner prompts, and easier end-to-end review.

## Junior engineer pitfall

A junior engineer may assume shared setup is always better, without seeing how shared structure can hide domain mismatch.

## Mid-level engineer view

A mid-level engineer should notice that a product with public/private hybrid behavior deserves especially clear boundaries.

## Senior engineer concern

A senior engineer worries that premature platformization creates long-lived friction and obscures accountability across products.

## Recommended AI workflow

Mode A: Single Agent

This stage is better handled by one agent because consistency of architectural narrative matters more than parallelism right now.

## Suggested prompt pattern

Bad prompt:

"Make a feedback board."

Better prompt:

"Design the initial structure for a realistic feedback board with voting, moderation, roadmap statuses, and strong docs."

Strong prompt:

"I am building a feedback management platform as a separate project in a shared workspace. Compare structure options, recommend one, explain the AI workflow choice, and document the decision in architecture, learning, and AI workflow docs."

## Verification checklist

- Does the chosen structure protect the feedback domain from CRM concerns?
- Are moderation, public UI, and internal-note flows likely to have clear homes later?
- Did we avoid premature shared abstractions?

## Decision impact on the codebase

- The feedback platform will live entirely inside `customer-feedback-board/`.
- Future modules will be organized around feedback, moderation, roadmap, and admin concerns.
- AI prompts and review slices can stay product-specific.

## FB-ADR-002

## Stage

Internal application architecture

## Why this matters

The hard part of a feedback board is not rendering cards. It is keeping voting, duplicate merges, moderation, visibility rules, and PM updates coherent.

## Options considered

### Option A: Thin Next.js pages/components with most logic nearby
- What it is: page files and components own much of the mutation and moderation logic.
- Strengths: quick to start.
- Weaknesses: visibility rules and merge behavior get scattered.
- Future pain points: public/private logic becomes hard to audit.
- When a team would choose it: very small prototypes.

### Option B: Modular monolith with App Router, feature modules, server components for reads, server actions for writes, and explicit services/repositories
- What it is: route files stay thin while feature modules own schemas, policies, services, and repositories.
- Strengths: clearer moderation and visibility boundaries, easier code review, and realistic long-term structure.
- Weaknesses: more setup.
- Future pain points: requires discipline to keep business logic out of page code.
- When a team would choose it: workflow-heavy products that need to stay readable.

### Option C: Separate frontend and backend service
- What it is: UI and API are split from day one.
- Strengths: strongest technical separation.
- Weaknesses: higher operational and implementation overhead.
- Future pain points: slower local iteration and more contract maintenance.
- When a team would choose it: larger teams or multi-client systems.

## Recommendation

Choose **Option B**.

## Junior engineer pitfall

A junior engineer may focus on the public UI and miss how much logic moderation and duplicate handling add.

## Mid-level engineer view

A mid-level engineer should notice that visibility and moderation policies deserve explicit backend homes.

## Senior engineer concern

A senior engineer worries about public/private behavior being implemented inconsistently across pages.

## Recommended AI workflow

Mode A: Single Agent

## Suggested prompt pattern

"Design the internal architecture of a feedback platform so voting, moderation, duplicate merging, and roadmap communication stay reviewable."

## Verification checklist

- Can a reviewer find moderation and visibility rules without reading lots of UI code?
- Are post mutations and comment mutations routed through clear services?
- Do public and internal concerns have obvious homes?

## Decision impact on the codebase

- Feature modules will live under `src/modules`.
- Page files will mostly assemble views and call server actions.
- Services and policies will carry the heavier business behavior.

## FB-ADR-003

## Stage

Persistence strategy

## Why this matters

We need durable local behavior for votes, comments, follows, and moderation actions while keeping the codebase easy to run and study.

## Options considered

### Option A: In-memory data only
- What it is: static fixtures that reset constantly.
- Strengths: fastest.
- Weaknesses: too shallow for realistic moderation and activity behavior.
- Future pain points: difficult to study workflow evolution.
- When a team would choose it: throwaway demos.

### Option B: File-backed JSON repositories behind typed interfaces
- What it is: repositories persist structured JSON through server-only helpers.
- Strengths: durable enough for local study, easy to run, and still teaches clean repository boundaries.
- Weaknesses: not production-safe for concurrency-heavy usage.
- Future pain points: limited querying and transaction support.
- When a team would choose it: training builds and local demos.

### Option C: Full relational database and ORM from day one
- What it is: PostgreSQL/SQLite and ORM setup immediately.
- Strengths: strongest production realism.
- Weaknesses: more setup and schema churn before the domain stabilizes.
- Future pain points: up-front complexity across two apps in one build cycle.
- When a team would choose it: teams ready to invest in full persistence design immediately.

## Recommendation

Choose **Option B**.

## Junior engineer pitfall

A junior engineer may think "simple storage" means "simple architecture," but repository seams still matter.

## Mid-level engineer view

A mid-level engineer should notice that persistence choices shape how replaceable the rest of the code is.

## Senior engineer concern

A senior engineer worries about accidental coupling to a teaching-only persistence mechanism.

## Recommended AI workflow

Mode A: Single Agent

## Suggested prompt pattern

"Choose a local-friendly persistence strategy for a feedback board that still teaches realistic repository design."

## Verification checklist

- Are repositories isolated from page code?
- Can storage be swapped later without rewriting services?
- Are limitations documented clearly?

## Decision impact on the codebase

- Seeded JSON data will live under `data/`.
- Server-only persistence helpers will live under `src/server`.
- Services will depend on repositories rather than raw file access.

## FB-ADR-004

## Stage

Auth and authorization strategy

## Why this matters

The platform has public browsing, authenticated actions, moderation tools, PM-only updates, and admin settings. Weak auth boundaries make the whole app dishonest.

## Options considered

### Option A: Full external auth integration now
- What it is: Auth.js, Clerk, or another external auth system from the start.
- Strengths: realistic auth infrastructure.
- Weaknesses: identity setup would dominate the early project.
- Future pain points: more complexity than needed to learn the domain.
- When a team would choose it: production or identity-heavy builds.

### Option B: Demo cookie sessions with seeded users and server-side policy checks
- What it is: demo users authenticate locally and the server enforces role and visibility rules.
- Strengths: realistic authorization without heavy identity setup.
- Weaknesses: not a production auth system.
- Future pain points: later replacement with real identity integration.
- When a team would choose it: training and prototype systems that still want honest permission boundaries.

### Option C: UI-only role toggles
- What it is: the frontend pretends roles exist but the server does not enforce them.
- Strengths: quick to fake.
- Weaknesses: teaches the wrong lesson and breaks trust in moderation/visibility logic.
- Future pain points: impossible to review as real authorization.
- When a team would choose it: not recommended here.

## Recommendation

Choose **Option B**.

## Junior engineer pitfall

A junior engineer may think guest/public access means auth can be added later, but visibility rules are part of the domain from the start.

## Mid-level engineer view

A mid-level engineer should notice that authorization is the real complexity, not just login mechanics.

## Senior engineer concern

A senior engineer worries about hidden moderation rules and internal-note visibility checks scattered around the UI.

## Recommended AI workflow

Mode A: Single Agent

## Suggested prompt pattern

"Design a local-friendly auth model for a feedback board with guests, users, moderators, PMs, and admins while keeping server-side policy enforcement explicit."

## Verification checklist

- Are guests blocked only where appropriate?
- Are moderation and PM-only actions enforced server-side?
- Is the auth simplification documented clearly?

## Decision impact on the codebase

- Auth helpers and policy checks will live in modules, not page conditionals.
- Layouts and server actions will read the current user from cookies.
- UI visibility will follow permissions but not replace them.
