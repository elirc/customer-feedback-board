# When To Use One Agent Vs Subagents

## Current guidance

Use a single agent for:

- early architecture choices
- small, coherent feature slices
- documentation updates tied to one decision

Use subagents later when:

- implementation splits cleanly across unrelated modules
- planner/reviewer/tester roles add clear value
- there is enough code to benefit from parallelism
