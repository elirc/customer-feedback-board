# Testing Strategy Notes

Likely critical tests:

- one-vote-per-user behavior
- duplicate merge integrity
- comment visibility and locking
- moderation actions
- official status transitions
- follow/notification behavior

## Current status

Current automated verification:

- `npm run typecheck`
- `npm run build`

## Why this is not the full end state

Compile-time checks do not prove moderation correctness or one-vote-per-user behavior under all conditions.

## Recommended next tests

- vote-toggle service tests
- duplicate-merge service tests
- post-visibility tests for guests versus authenticated staff roles
- status-change notification tests
