# Future Extension Risks

Likely future pressures:

- internal-only boards
- customer segmentation
- custom statuses
- release note integrations
- weighted voting
- large-scale moderation queues

This file will track where the initial design is intentionally simple and where growth may require refactoring.

## Known intentional tradeoff

File-backed persistence is a teaching choice for local execution. If the app scales, the first likely refactor is moving repositories to a relational database while keeping services, policies, and route boundaries intact.
