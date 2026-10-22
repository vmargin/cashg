<!-- sauron:start (managed by Sauron; edit outside this block) -->
# Native Codex integration

Sauron is installed locally in tools/sauron. Project settings in config.toml enable native agents; .codex/agents/*.toml defines the Fellowship. AGENTS.md routes to .codex/instructions.md. Shared skills are in .agents/skills/.

Run node scripts/sauron.mjs doctor to check the harness. Use node scripts/sauron.mjs run "<task>" for real Sauron lookup followed by a Codex session. Restart an existing session to load new native agent configuration. Parent model, provider and permissions are inherited.
<!-- sauron:end -->
