# PR Slices

## Slice 001: Initial feedback-platform architecture foundation

### Purpose

Create the feedback project folder, docs, and first decision records before implementation.

### Files touched

- `customer-feedback-board/README.md`
- files under `customer-feedback-board/docs/architecture`
- files under `customer-feedback-board/docs/learning`
- files under `customer-feedback-board/docs/ai-workflows`

### Main risks

- documenting decisions too generally
- creating the illusion of shared platform structure too early

### Reviewer focus

- are public and internal product concerns clearly separated?
- is the first structural decision realistic?

### Likely follow-up tasks

- decide application architecture
- decide domain model direction
- decide auth and persistence strategy

### What a junior reviewer might miss

- how public and internal product workflows can make "shared app" complexity worse

### What a stronger reviewer would flag

- any premature shared infrastructure that is not justified by real reuse

## Slice 002: Feedback platform runnable foundation

### Purpose

Turn the documented plan into a working Next.js app with session plumbing, persistence helpers, and core feedback-domain modules.

### Files touched

- config files at the project root
- `src/modules/auth/*`
- `src/modules/feedback/types.ts`
- `src/modules/feedback/repository.ts`
- `src/modules/feedback/service.ts`
- `src/server/json-store.ts`
- `data/feedback-db.json`

### Main risks

- leaking moderation and visibility logic into route files
- simplifying guest/auth behavior so much that it stops being realistic

### Reviewer focus

- do services own the meaningful product behavior?
- are public/private boundaries explicit?

### Likely follow-up tasks

- richer taxonomy management
- release-note linking
- threaded comments and bulk moderation improvements

### What a junior reviewer might miss

- why moderation actions and flags should not be collapsed into one generic structure

### What a stronger reviewer would flag

- any hidden server-side policy gap in vote/comment/merge flows

## Slice 003: Feedback user-facing and operator flows

### Purpose

Implement board browsing, post detail, submission, voting, comments, follows, roadmap, moderation, notifications, and dashboard flows.

### Files touched

- `src/app/**/*`
- `src/components/*`
- `src/modules/feedback/actions.ts`

### Main risks

- post detail pages becoming overloaded
- inconsistent revalidation after mutations

### Reviewer focus

- can you trace each action from form to action to service to persistence?
- are PM-only and moderator-only affordances backed by server checks?

### Likely follow-up tasks

- export/reporting routes
- more advanced flag resolution workflows

### What a junior reviewer might miss

- why public UI does not mean simple backend logic

### What a stronger reviewer would flag

- any divergence between roadmap state and canonical post state
