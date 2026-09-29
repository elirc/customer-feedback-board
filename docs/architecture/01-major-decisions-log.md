# Major Decisions Log

| ID | Stage | Status | Chosen option | Why it matters | Related docs |
| --- | --- | --- | --- | --- | --- |
| FB-ADR-001 | Project/app structure | accepted | Standalone Next.js modular monolith inside its own project folder | Keeps the feedback platform independent, easier to study, and free from CRM-specific coupling | `02-options-considered.md`, `04-data-flow-notes.md`, `05-frontend-structure-notes.md`, `06-backend-services-notes.md` |
| FB-ADR-002 | Internal application architecture | accepted | Next.js App Router modular monolith with feature modules, server components for reads, server actions for writes, and explicit service/repository layers | Keeps public browsing, moderation, and PM workflows reviewable as the feature set grows | `02-options-considered.md`, `04-data-flow-notes.md`, `05-frontend-structure-notes.md`, `06-backend-services-notes.md` |
| FB-ADR-003 | Persistence strategy | accepted | File-backed JSON repository adapter behind typed repositories | Makes the feedback board runnable locally while preserving clean seams for later database adoption | `03-domain-model-notes.md`, `04-data-flow-notes.md`, `06-backend-services-notes.md`, `09-future-extension-risks.md` |
| FB-ADR-004 | Auth and authorization strategy | accepted | Cookie-based demo session with seeded users and server-side visibility and moderation policy checks | Keeps roles and visibility rules explicit without blocking on external auth setup | `02-options-considered.md`, `07-auth-and-permissions-notes.md`, `04-data-flow-notes.md` |
| FB-ADR-005 | Validation strategy | accepted | Zod schemas at mutation boundaries plus light UI constraints | Centralizes validation for posts, comments, moderation actions, and settings changes | `04-data-flow-notes.md`, `06-backend-services-notes.md`, `08-testing-strategy-notes.md` |

## FB-ADR-001 notes

- Chosen in the initial setup stage.
- We intentionally kept the feedback product separate from the CRM.
- The platform will evolve inside `customer-feedback-board/` with project-local docs and later project-local runtime configuration.

## FB-ADR-002 notes

- We considered thin route files, a modular monolith, and a split frontend/backend service model.
- We chose the modular monolith because it creates realistic boundaries without separate-service overhead.

## FB-ADR-003 notes

- We considered in-memory fixtures, file-backed persistence, and a full relational database.
- We chose file-backed persistence to keep the app immediately runnable while still teaching repository boundaries.

## FB-ADR-004 notes

- We considered external auth, demo-cookie sessions, and UI-only role toggles.
- We chose demo-cookie sessions so the code can focus on moderation and visibility policies instead of identity-provider setup.

## FB-ADR-005 notes

- We considered component-local validation, centralized schemas, and ad hoc validation.
- We chose centralized schemas because they are easier to test and reason about.
