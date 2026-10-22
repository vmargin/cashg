---
name: sauron
description: Use the project's installed Sauron skills, Fellowship agents and engineering workflow for material development tasks in this Java banking simulator. Skip full orchestration for tiny edits.
---

Read `AGENTS.md`, `.codex/instructions.md` and the relevant routing in `context/SAURON-WORKFLOW.md`.

Run `node scripts/sauron.mjs find-skill "<task>" --limit 5 --json` when selecting installed guidance. Read only the matching `.agents/skills/<name>/SKILL.md` and necessary references. Use actual available `.claude/agents/` specialists for bounded tasks with explicit ownership. Preserve other workers' edits.

For material changes, trace the affected Java/controller/service/repository/template/tests, state acceptance criteria and invariants, implement at the owning layer, run focused verification and inspect the result. For a complete frontend pass, route all six design stages and record outcomes once. Preserve Cash - G branding, Thymeleaf bindings, CSRF and server-held one-use financial reviews.

Existing user authorization governs routine reversible work; generic skill templates do not require repeated approval. Do not run maintenance, publish, deploy or commit as an incidental workflow step. Report commands, results, skips and evidence limits. The Sauron harness supplies guidance; Claude executes the task.
