# Backend Services Notes

Expected service concerns:

- feedback post services
- vote services
- comment and moderation services
- duplicate merge services
- notification/follow services
- taxonomy/settings services

## Current status

Accepted direction:

- application services orchestrate post, vote, comment, follow, and moderation use cases
- repositories encapsulate file-backed persistence
- policy helpers enforce role and visibility rules
- moderation and official-update events are treated as core business behavior
