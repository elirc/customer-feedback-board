# Decision Journal

## Entry 001

### Stage

Initial feedback-platform project structure

### Recommended AI mode

Mode A: Single Agent

### Why that mode fits

The work was architectural framing and documentation with no need for parallel subagents yet.

### Prompts used

- compare project-structure options for a realistic feedback platform in a shared workspace
- recommend one and record it in docs

### Context included

- feedback-board requirements
- documentation and learning requirements
- need for separate project folders

### Context excluded

- detailed future implementation files that do not exist yet
- unnecessary shared-platform assumptions

### Verification steps

- confirm the project lives under its own root folder
- confirm decision docs reflect the chosen option

### Mistakes AI was likely to make here

- over-sharing infrastructure with the CRM
- reducing moderation complexity to generic CRUD structure

### How a human should supervise this step

- check whether the folder structure and docs will still make sense when moderation, duplicate merging, and PM workflows are added

## Entry 002

### Stage

Feedback-platform implementation and verification

### Recommended AI mode

Mode D: Agent + Tools

### Why that mode fits

Real code requires build tooling to validate server/client boundaries, route usage, and type behavior. Reasoning alone is not enough.

### Prompts used

- scaffold a runnable modular-monolith feedback board
- keep moderation and visibility logic in services and policies
- verify by running install, typecheck, and build

### Context included

- accepted architecture decisions
- role model and workflow requirements
- need for study-friendly docs and reviewable boundaries

### Context excluded

- speculative enterprise deployment details
- unrelated CRM-specific workflow details

### Verification steps

- `npm install`
- `npm run typecheck`
- `npm run build`

### Mistakes AI was likely to make here

- flattening moderation and PM workflows into generic CRUD
- missing route-framework type issues
- relying on UI gating instead of server-side role checks

### How a human should supervise this step

- read the service layer first
- verify that guests, moderators, PMs, and admins are treated differently in code, not just in the UI
- confirm that duplicate merge and status changes produce traceable state transitions
