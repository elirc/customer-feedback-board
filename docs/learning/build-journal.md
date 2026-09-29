# Build Journal

## Entry 001

### Stage

Initial workspace split and feedback-platform architecture framing

### What decision was made

- The feedback platform will be built in its own folder as a standalone modular monolith.

### What options were considered

- one shared app for both products
- two separate project folders
- a monorepo with shared packages from day one

### Why the final option was chosen

It keeps public-facing feedback flows, moderation logic, and roadmap communication isolated from the CRM domain and easier to study.

### Files/modules created or changed

- `README.md`
- `customer-feedback-board/README.md`
- `customer-feedback-board/docs/architecture/*`
- `customer-feedback-board/docs/learning/*`
- `customer-feedback-board/docs/ai-workflows/*`

### What to study later

- why public/private hybrid apps need clear product boundaries
- how duplicate merge logic and moderation pressures shape architecture

### Questions to ask yourself when reviewing

- will future moderation and roadmap features still fit naturally?
- did we avoid vague shared abstractions?

### How AI was used in this stage

- single-agent architecture reasoning
- structured documentation creation

### Workflow mode used

Mode A: Single Agent

### What worked well

- a clear product-local documentation trail

### What was risky or required manual verification

- ensuring the early structure still leaves room for later shared patterns if they become genuinely useful

## Entry 002

### Stage

Feedback-platform implementation baseline decisions

### What decision was made

- internal architecture: modular monolith with App Router, feature modules, server components for reads, and server actions for writes
- persistence: file-backed JSON repositories behind typed services
- auth: guest/public browsing plus cookie session auth for seeded users
- validation: Zod schemas at mutation boundaries

### What options were considered

- thin page-driven architecture versus explicit service layers
- in-memory fixtures versus file-backed repositories versus full DB setup
- external auth versus demo session auth versus UI-only role toggles

### Why the final option was chosen

It keeps the feedback board runnable and reviewable while focusing the learning value on moderation, visibility, and workflow boundaries.

### Files/modules created or changed

- `docs/architecture/01-major-decisions-log.md`
- `docs/architecture/02-options-considered.md`
- `docs/architecture/04-data-flow-notes.md`
- `docs/architecture/06-backend-services-notes.md`
- `docs/architecture/07-auth-and-permissions-notes.md`
- `docs/architecture/09-future-extension-risks.md`

### What to study later

- why visibility rules are domain logic, not just UI conditions
- how a simple persistence engine can still sit behind realistic repository seams

### Questions to ask yourself when reviewing

- can I find moderation and visibility checks without walking through the UI tree?
- if the storage engine changed, would most service code survive?
- where are official updates and merge history recorded?

### How AI was used in this stage

- decision synthesis
- tradeoff articulation
- docs updates before implementation

### Workflow mode used

Mode A: Single Agent

### What worked well

- the architecture gives clear homes to public and internal behaviors

### What was risky or required manual verification

- making sure the simplified auth and persistence choices do not hide the real complexity of moderation and visibility logic

## Entry 003

### Stage

Feedback-board implementation slice

### What decision was made

- build a runnable local feedback platform with public browsing, authenticated actions, moderation tools, and PM/admin workflows

### What options were considered

- stop at architecture scaffold versus implement core end-to-end interactions
- use route handlers for every mutation versus server actions over explicit services

### Why the final option was chosen

Server actions over explicit services let us ship real post, vote, comment, follow, and moderation flows quickly while keeping the business logic readable and testable.

### Files/modules created or changed

- `package.json`, `tsconfig.json`, `next.config.ts`
- `src/app/**/*`
- `src/components/*`
- `src/modules/auth/*`
- `src/modules/feedback/*`
- `src/server/json-store.ts`
- `data/feedback-db.json`

### What to study later

- `src/modules/feedback/service.ts` for visibility, moderation, and notification logic
- `src/app/post/[slug]/page.tsx` for a realistic mixed public/internal detail page
- `src/app/moderation/page.tsx` for how duplicate merges are exposed to operators

### Questions to ask yourself when reviewing

- where is one-vote-per-user actually enforced?
- where are guest/public visibility rules enforced?
- what would need to change if internal-only boards were added later?

### How AI was used in this stage

- scaffold generation
- repetitive file creation
- compile/build verification
- fast correction after framework-specific issues

### Workflow mode used

Mode D: Agent + Tools

### What worked well

- build tooling forced honest server/client and route-typing correctness

### What was risky or required manual verification

- confirming that simplified auth and persistence still teach the right architecture lessons
