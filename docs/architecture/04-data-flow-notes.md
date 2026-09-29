# Data Flow Notes

Important flows will include:

- creating and editing posts
- voting and unvoting
- commenting
- moderation actions
- duplicate merging
- following and notifications
- status changes and official responses

## Current status

Data flow shape now follows accepted decisions FB-ADR-002 through FB-ADR-005:

1. Public and authenticated pages read view models through feature services.
2. Mutations happen through server actions.
3. Server actions authenticate the actor, validate input with Zod, and call application services.
4. Services enforce visibility and moderation policies, persist through repositories, and record activity.
5. Revalidation refreshes the affected pages.

## Why this is a good teaching shape

- It keeps public UI simple without hiding backend complexity.
- It creates explicit homes for moderation and visibility rules.
- It makes duplicate merges, official updates, and vote behavior easier to review.
