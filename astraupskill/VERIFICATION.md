# Verification record and operating limits

The final local run passed **59 checks**: 43 backend, persistence, credential, concurrency, and setup tests plus 16 Chromium browser scenarios. TypeScript checking and the production Next.js build also passed. The run used Node 22.16.0, Next.js 16.1.6, React 19.2.3, SQLite 3.49.1 through Node's built-in module, and Playwright 1.60 Chromium. The Node runtime labels its SQLite module experimental; the repository pins its application dependencies and documents that runtime requirement.

## What the checks establish

The backend suite exercises strict command validation, current-role authorization, guest and internal visibility, post ownership, comment ownership, captured versions, deletion references, desired vote/follow state, flag resolution, notifications, and duplicate merges. It includes a transaction exception, invalid aggregate references, malformed stored content, and a SQLite trigger that aborts the final write. Independent reads verify that a failed status update did not leave behind an audit or notification. Two separate Node processes repeatedly enable the same vote, establishing that the persistence boundary coordinates more than one in-memory service instance.

Setup tests use a disposable directory, confirm that generated configuration is parseable, and verify that a second setup refuses to overwrite the created database. The application never loads the original collection JSON implicitly. Its generated fictional workspace is a separate SQLite file.

Browser scenarios cover actual password sign-in and cookie clearing, rejection of the old unsigned identity cookie, customer privacy, idea CRUD, stale drafts with export, whitespace validation, votes, follows, comment CRUD, reference-aware deletion, product decisions, notification ownership, moderation, settings, merging, navigation guards, and expired sessions. Pending writes coordinate forms so another mutation cannot submit while a current form request is pending. Delete commands use the latest rendered version; dirty editable forms retain their original captured version.

The first browser run exposed a stale delete attempt while a comment edit was still completing, plus assertions that matched Next.js's separate route announcer or checked cookies before sign-out finished. The final implementation coordinates pending writes, and the corrected tests wait for accepted behavior and scope error assertions to the relevant form. All final scenarios passed without retries.

## Visual evidence

Reviewed [desktop board](images/desktop.png), [narrow board](images/narrow.png), [desktop detail](images/detail-desktop.png), and [narrow detail](images/detail-narrow.png) captures. The browser suite asserts no horizontal page overflow at 1440 and 390 pixels. These checks establish useful layout evidence without claiming a full accessibility certification.

## Practical boundaries

This is a local single-board application, not a deployed multi-tenant service. Generated local credentials, signed 30-minute cookies, and process-local account throttling do not include MFA, password reset, external identity, distributed limits, or server-side session revocation. The whole validated database aggregate is limited to 16 MiB and 10,000 records per collection; write cost grows with aggregate size.

Creates and comments lack durable idempotency receipts. A lost response requires reviewing current records before retrying. Drafts are memory-only with manual export and no import or automatic merge. Notifications are in-app only and display the newest 100; staff detail timelines show the newest 30 events. Merges have no undo interface. The original JSON is preserved without an import migration. Power-loss behavior, comprehensive accessibility, and production deployment were not certified. Use the exercises to address these limitations deliberately rather than assuming the passing suite covers them.
