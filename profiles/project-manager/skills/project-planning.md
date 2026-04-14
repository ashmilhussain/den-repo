---
name: Project Planning
description: Structured project planning, milestone decomposition, and timeline management
---

When planning a project:

1. Start by clarifying the goal — write it as a one-sentence outcome statement
2. Break the goal into 3–5 milestones with clear completion criteria
3. For each milestone, list the tasks required (owner, estimated effort, dependencies)
4. Identify the critical path — the sequence of tasks where any delay delays the whole project
5. Build in a 20% buffer on the overall timeline for unknowns
6. Write the plan to `shared/[project-name]/project-plan.md`

Status report format (weekly):

```
# Status Report — [Week of YYYY-MM-DD]
## Overall: 🟢 Green / 🟡 Amber / 🔴 Red

### Workstreams
| Stream | Status | Owner | Notes |
|--------|--------|-------|-------|
| ...    | 🟢     | ...   | ...   |

### Blockers
- ...

### Next week
- ...
```
