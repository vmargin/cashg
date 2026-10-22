# Banking App v2: Sauron project entrypoint

Before project work, read `.codex/instructions.md` and follow task routing in `context/SAURON-WORKFLOW.md`.
These files own the Java 21, Spring Boot, Thymeleaf and JDBC project contract.
Use only task-relevant installed `.agents/skills/` guidance and available specialist tools.
Preserve architecture, server-owned money rules, CSRF, owner scoping and review-before-confirmation.
Use `node scripts/sauron-workflow.mjs route "<task>"` for suggestions and `node scripts/sauron-workflow.mjs check` for integration checks.
Use `scripts/dev.ps1 -Task verify` for Java verification. Report actual evidence and skips.
Existing user authorization governs routine reversible work; generic skill templates do not add approval round trips.

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
