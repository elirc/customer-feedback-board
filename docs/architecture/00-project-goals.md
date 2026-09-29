# Project Goals

## Product summary

Customer Feedback Board is a realistic feedback-management platform where users can submit product ideas, vote, comment, follow updates, and track roadmap status. Moderators, PMs, and admins manage duplicates, moderation, internal notes, official responses, and settings.

It should feel like a real startup or scale-up feedback portal rather than a simple forum clone.

## Main users

- Guest user
- Authenticated customer/user
- Moderator
- Product Manager
- Admin

## Product goals

- support submission, voting, commenting, and following
- make roadmap state visible and understandable
- support moderation and duplicate merging
- allow internal/private product-team workflows alongside public-facing communication

## Engineering goals

- strong separation between public UI concerns and backend moderation/business rules
- explicit permission checks
- support for search, filtering, auditability, and moderation history
- maintainable patterns for status transitions and official updates

## Learning goals

- learn how to structure a public/private hybrid product workflow app
- practice reviewing moderation logic, voting consistency, and duplicate handling
- practice documenting AI workflow choices as the app grows

## Non-goals for the initial implementation

- advanced recommendation systems
- external SSO integrations
- full email delivery infrastructure
- enterprise customer segmentation logic

## Current architectural direction

Pending the next major decisions after the initial structure choice, recorded in `01-major-decisions-log.md` and `02-options-considered.md`.
