# Frontend Structure Notes

This file will describe the feedback board frontend organization.

Expected areas include:

- public browse and detail pages
- authenticated post creation/editing flows
- moderation tools
- PM/admin controls
- dashboard/analytics views

## Current status

Implemented with thin App Router pages under `src/app` and shared UI helpers under `src/components`.

## Current frontend structure

- `src/app/page.tsx`: public board feed
- `src/app/post/[slug]/page.tsx`: post detail with comments, votes, follows, official updates, and internal notes
- `src/app/new/page.tsx`: authenticated post submission flow
- `src/app/roadmap/page.tsx`: roadmap projection
- `src/app/dashboard/page.tsx`: moderator/PM analytics
- `src/app/moderation/page.tsx`: duplicate-merge and flag center
- `src/app/notifications/page.tsx`: in-app update queue
- `src/app/settings/page.tsx`: admin settings surface
- `src/components/*`: shell, status badges, page headers, and timeline UI

## Teaching note

The page files should answer "what does this page need to show?" The service layer should answer "what business rules and state changes does this flow require?"
