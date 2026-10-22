# Repository instructions

Before project work, read `.codex/instructions.md`. That file owns project conventions, validation commands and code guidance. This entrypoint routes to it without duplicating its rules.

Automatically apply the task routing and proportional verification in `context/SAURON-WORKFLOW.md`. Read only matching installed skills. Use Fellowship agents when a bounded specialist task benefits the work; keep routine changes in one agent. `node scripts/sauron-workflow.mjs route "<task>"` suggests applicable skills without running them. Higher-priority runtime instructions and the user's authorized scope govern execution.

<!-- sauron:start (managed by Sauron; edit outside this block) -->
# Sauron native project integration

Read `.codex/instructions.md` and use `context/SAURON-WORKFLOW.md` for task routing.
The pinned Sauron CLI lives in `tools/sauron/`. Use `node scripts/sauron.mjs` from this project.
Build and verify Java with `scripts/dev.ps1 -Task verify`; Maven remains the application build system.
Native Codex Fellowship agents live in `.codex/agents/`; Claude agents live in `.claude/agents/`.
Use installed `.agents/skills/` selectively and preserve server-owned financial rules.
Use `node scripts/sauron.mjs doctor` to verify the native harness and local skill lookup.
Use `node scripts/sauron.mjs run "<task>"` to look up Sauron skills and launch Codex for an authorized task.
Keep user settings outside Sauron managed blocks. Do not replace project rules with generic upstream defaults.
<!-- sauron:end -->
