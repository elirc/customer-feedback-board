# File Reading Order

Start with:

1. `docs/architecture/00-project-goals.md`
2. `docs/architecture/01-major-decisions-log.md`
3. `docs/architecture/02-options-considered.md`
4. `docs/learning/build-journal.md`

## Then read the actual code in this order

1. `src/modules/feedback/types.ts`
2. `src/modules/feedback/schemas.ts`
3. `src/modules/feedback/service.ts`
4. `src/modules/feedback/actions.ts`
5. `src/modules/feedback/repository.ts`
6. `src/modules/auth/session.ts`
7. `src/app/post/[slug]/page.tsx`
8. `src/app/page.tsx`
9. `src/app/moderation/page.tsx`

## Why this order works

It helps you learn the domain and policy model before you study how the UI consumes it.
