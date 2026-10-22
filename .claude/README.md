<!-- sauron:start (managed by Sauron; edit outside this block) -->
# .claude/

> Managed by Sauron. Project-level Claude Code configuration.

## Folder map

- `settings.json`: shared project settings (permissions, hooks, env).
- `rules/`: Modular project instructions loaded alongside `CLAUDE.md`, optionally scoped to file paths.
- `skills/`: Reusable skills Claude loads on demand or via `/<skill-name>`. Skills replace the legacy `.claude/commands/` folder.
- `agents/`: Project subagents with their own system prompt, tools, and model.
- `workflows/`: Multi-step workflow definitions shared with the team.
- `output-styles/`: Custom output styles that change how Claude responds.
- `agent-memory/`: Persistent memory files written by subagents across sessions.
- `docs/`: Reference documents Claude can read on demand without loading them into every session.

Project instructions live in `CLAUDE.md` at the repository root. MCP servers go in `.mcp.json` at the root.

## Legacy

`.claude/commands/` is the older slash-command format. It still works, and Sauron installs its commands there; for new workflows prefer `.claude/skills/<name>/SKILL.md`.

## Official docs

https://code.claude.com/docs/en/claude-directory
<!-- sauron:end -->
