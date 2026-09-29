# Domain Model Notes

This file will track the feedback platform domain model for:

- users and roles
- feedback posts
- votes
- comments
- categories and tags
- follows and notifications
- moderation flags and actions
- merge history
- official updates and internal notes

## Early modeling concerns

- how duplicate merging preserves votes, comments, follows, and auditability
- how public status and private internal notes relate without leaking data
- where moderation history should live

## Current status

Implemented in the current codebase with file-backed persistence and typed modules.

## Implemented model shape

The current model lives primarily in `src/modules/feedback/types.ts` and `data/feedback-db.json`.

Core entities:

- `FeedbackPost`
- `Vote`
- `Comment`
- `Follow`
- `ModerationFlag`
- `ModerationAction`
- `MergeHistory`
- `OfficialUpdate`
- `InternalNote`
- `Notification`
- `FeedbackSettings`

## Important modeling choices

- `FeedbackPost` carries public-facing status and visibility, while internal commentary stays in separate `InternalNote` records.
- `Vote` and `Follow` are separate relationship entities, which keeps notification and duplicate-handling behavior explicit.
- `ModerationFlag`, `ModerationAction`, and `MergeHistory` are distinct because flags are user reports, actions are staff interventions, and merges are a specialized audit event.

## Teaching note

A junior engineer often tries to collapse roadmap updates, moderation history, and internal notes into one generic timeline table. Stronger modeling keeps those concepts separate because they have different permissions and product meaning.
