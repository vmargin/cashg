# Sauron workflow for Cash - G

This project uses Sauron as development guidance over its existing Java application. `AGENTS.md` routes to `.codex/instructions.md`; editor entrypoints share that contract. `.sauron/workflow.json` contains installed capability paths. This is project-owned configuration, separate from the vendor installer manifest and its historical checksums.

## Native activation

Sauron 3.0.0 is now installed as a pinned local dependency in `tools/sauron/`, with an npm lockfile. The real native CLI initialization has been applied for Codex and Claude. The saved `init` plan in `sauron.config.yaml` selects those two runtimes, Fellowship agents, no bulk skill installation and no bulk command installation. Existing shared skills and project commands remain available. The wrapper replaces the upstream generator's hardcoded Node application instructions with the Java project contract through Sauron's own conflict manager.

Codex discovers nine project role files in `.codex/agents/`. `.codex/config.toml` enables native multi-agent V2 and limits specialist concurrency to three. Roles inherit the parent model, provider and permissions. Configuration is loaded for new sessions; restart an already-open Codex session to load new native roles. Claude has `.claude/agents/` and an on-demand `.claude/skills/sauron/SKILL.md` entrypoint to the shared skill library.

```powershell
npm ci --prefix tools/sauron --ignore-scripts --no-audit --no-fund
node scripts/sauron.mjs doctor
node scripts/sauron.mjs find-skill "Java Spring Boot service" --limit 5 --json
node scripts/sauron.mjs run "Implement the requested project change"
```

`run` performs the real Sauron skill lookup, then launches the signed-in Codex CLI with the task, actual lookup results and project workflow. It uses direct process arguments and inherits runtime settings. The application does not call an AI provider. The coordinating assistant can also use the local Sauron lookup and available native agents directly without launching another session. For material tasks, perform that lookup automatically; small fixes need no extra orchestration.

Use `node scripts/sauron.mjs init --dry-run` to preview native initialization and `node scripts/sauron.mjs init` (or `sync`) to apply the project-safe wrapper. It invokes the actual pinned native initializer, preserves user-authored content and adapts managed blocks. Backups live under ignored `.sauron/backups/`. Use the wrapper for future initialization rather than the raw global CLI.

## Automatic task handling

At task start, inspect Git state, read the project instructions and the relevant product, architecture and design sections, then inspect affected source and tests. Select only the matching capabilities below. Task routing is an instruction for the executing assistant; it does not run an autonomous background service or call an AI provider from the application.

| Work | Relevant installed skills under `.agents/skills/` | Specialist when useful |
| --- | --- | --- |
| Existing-project integration | `adapt-project` | Aragorn for boundaries |
| Material feature or architecture | `engineering-loop/blueprint-session`, `java-spring-principles` | Gandalf plans, Aragorn reviews architecture, Frodo implements |
| Schema or money persistence | `database-principles`, `database-migration` | Aragorn and Pippin |
| Authentication, ownership, financial actions | `auth-architecture`, `security-auditor`, `frontend-security` | Boromir |
| UI or responsive design | `design-engineering`, `html-css-principles`, `accessibility-auditor` | Aragorn and Merry |
| Forms and recovery | `forms-validation`, `error-handling` | Merry |
| Tests and failure diagnosis | `testing-principles`, `engineering-loop/failure-triage` | Merry, Legolas, Pippin for boundary cases |
| Post-change inspection | `engineering-loop/code-inspection` | Merry or a separate reviewer |
| Substantial session handoff | `engineering-loop/context-checkpoint` | Samwise |
| Explicit refactoring | Relevant language and inspection skills | Gimli |

Use the five engineering-loop stages when their triggers apply: blueprint before architectural decisions, UI snapshot/tokens when translating a reference, inspection after material changes, checkpoints for substantial handoffs, and triage for failures. A small fix needs a brief local trace and focused verification. It does not need all five stages, all nine agents, or a new planning document.

For material work, state acceptance criteria and applicable invariants, implement at the owning layer, test the behavior, inspect requirements and architecture, and report actual results. Store a plan or checkpoint under `context/engineering-loop/<task>/` only when it helps the task; do not scaffold empty templates. Use `PRODUCT.md`, `context/ARCHITECTURE.md`, this workflow and `.codex/instructions.md` as existing context rather than demanding nonexistent upstream template files.

The user's authorization and higher-priority runtime instructions govern execution. Existing authorization covers routine reversible project work. Do not create repeated approval gates from generic skill examples. Ask when necessary information or authorization is actually missing. Do not widen scope to database maintenance, external messaging, deployment or destructive operations as an incidental workflow step.

## Fellowship execution

Project-scoped role definitions live in `.codex/agents/` for Codex and `.claude/agents/` for Claude. Those runtimes discover their native definitions; other runtimes use their actual delegation tools and the role responsibilities in `.sauron/workflow.json`. Defining a role does not launch it. A runtime without subagents performs the relevant review itself and states that limit.

Keep one coordinating agent. Delegate only an independently useful task, with named file ownership, acceptance criteria and expected checks. Tell editing workers that they share the workspace and must preserve concurrent edits. Prefer read-only specialist reviews where ownership overlaps. Integrate and verify centrally. For small changes, keep one agent. Samwise's Git role grants no permission to commit, push or publish.

## Architecture and invariants

Preserve Java 21, Spring Boot, Spring Security, Thymeleaf, native HTML/CSS/JavaScript, repository interfaces and JDBC implementations. Feature controllers own HTTP parsing, models and redirects. `SessionAccounts` owns authenticated owner lookup and credential-fingerprint checks. Services own product validation; JDBC repositories and `MoneyWrites` own bounded atomic database changes. Composition in `BankingWebApplication` intentionally imports concrete repositories. Existing `SQLException` service contracts and legacy Swing compilation are part of the current architecture.

- Money uses validated `BigDecimal` amounts, at most two decimals, positive input and bounded persisted balances. The database remains the balance authority.
- Transfer account locks use ascending account IDs. Recheck ownership, status, currency and available funds before committing both balances, the operation claim and paired ledger entries together. Primary account compatibility balance updates belong in that transaction.
- Keep PHP, USD and savings reserves separate. Compute dashboard totals and insights from persisted data using their existing classifications.
- Keep owner-bound, expiring, server-held reviews and one-use UUID tokens. Wrong or stale tokens must not consume a newer review. Cancellation cannot change money.
- Preserve owner-scoped queries, CSRF, session renewal, credential-redacted views, credential-fingerprint invalidation and masked sensitive references.
- Normal PostgreSQL startup does not migrate or seed. Keep explicit maintenance separate. Preserve the protected v1 project and database. Use synthetic data only.

## Frontend design engineering

Read `.agents/skills/design-engineering/SKILL.md` for substantial UI work. Route the requested stage to an actual installed file. The manifest lists one applicable skill per stage; use a more specific installed subskill when the request warrants it. A full design pass records all six stages in one scoped artifact, including reasons for any stage requiring no changes.

| Stage | Apply to Cash - G |
| --- | --- |
| 1. Foundations | Use `design-system-architecture-spec`. Banking tasks are Operate; help is Read. Trace navigation, state, error recovery and template contracts. Reuse semantic tokens in `static/css/app.css` and `DESIGN.md`. |
| 2. Visual tuning | Preserve the existing navy/blue Cash - G workspace, readable money hierarchy and complete light theme. Use the existing low-motion direction. `utilitarian-minimalist-layout-engine` is optional guidance for a matching task; retain established panel depth and identity. The marketing-focused `anti-slop-aesthetic-tuning-engine` excludes complex dashboards and multistep forms and is not the default here. |
| 3. Identity | `DESIGN.md` owns Cash - G identity. Use `brand`, `design-system`, `ui-ux-pro-max` or the installed preset/moodboard references only for matching requests. Preserve current branding unless the user requests a change. |
| 4. Motion and interaction | Select the specific motion audit, vocabulary, prototype or review skill. Keep financial numbers and confirmation static, reduced-motion support and fine-pointer hover guards. Avoid a new animation dependency for routine feedback. |
| 5. Reference to code | Use `visual-comp-image-to-code-converter` for supplied references. Use the image-prompt and asset skills only when new assets are needed and the runtime provides suitable tools. Translate references into Thymeleaf with real server data. |
| 6. Audit | Use `visual-redesign-diagnostic-auditor` and relevant accessibility/form/security checks. Verify rendered behavior and stop when the scoped acceptance criteria pass. |

Preserve route names, HTTP methods, field names, Thymeleaf bindings, CSRF inputs, named submit buttons, server error recovery and review-before-confirmation. Preserve `theme.js` before CSS, `cash-g-theme` persistence and legacy theme-key compatibility. Browser validation and submitting feedback cannot authorize settlement. Keep practice cards local-only and account identifiers unbroken at narrow widths.

For changed screens, check 320, 390, 1024 and 1440 CSS pixels as applicable, both themes, keyboard focus, labels, error/empty states, contrast, reduced motion, contained table overflow and console errors. Test money flows with synthetic data against an isolated demo. Use `playwright-visual-testing-fixtures` when a browser harness is available or browser-test work is requested; existing historical audit scripts are not a maintained browser CI suite. Source inspection and Maven tests do not prove rendered accessibility.

Installed skills sometimes refer to upstream `skills/frontend/...` or `skills/workflow/...` paths. Resolve those to `.agents/skills/...`, check existence, and read only relevant references. For example, frontend architect references live under `.agents/skills/design-engineering/references/frontend-design-architect/`. Do not import React, Tailwind, GSAP, Zod or another stack merely because a generic skill example uses it.

## Commands and verification

Node 22 or later is a development prerequisite. The native Sauron npm dependency is isolated under `tools/sauron/` and adds no application runtime requirement. Selected skills are already local; tiny edits do not need a CLI call.

```powershell
node scripts/sauron-workflow.mjs check
node scripts/sauron-workflow.mjs route "Improve transfer review form layout"
node --test scripts/sauron-workflow.test.mjs
node scripts/sauron.mjs doctor
node --test scripts/sauron.test.mjs
.\scripts\dev.ps1 -Task verify
```

The small `sauron-workflow.mjs` router suggests matching skills and agents; select relevant ones before reading or delegating. That router never executes task text, agents or shell commands. The native `sauron.mjs run` command additionally launches Codex after real skill lookup. The integration check validates referenced local files, runtime pointers, native role definitions and six design stages. `.github/workflows/sauron.yml` installs the pinned CLI, runs the native doctor, and runs integration tests only when integration-related paths change. The Copilot session hook runs the lightweight read-only file check; it is not a security sandbox. Existing Java CI remains responsible for Maven verification.

For focused Java tests, use the Maven wrapper on JDK 21 with `-Dtest=<TestClass>`; on Windows the existing `dev.ps1` selects Temurin 21 for its supported tasks. Broaden to `verify` when behavior or shared contracts change. Report test skips explicitly. Native PostgreSQL tests require the explicit isolated local test target and opt-in; do not set credentials or enable them against a deployed database. Integration-only edits do not require browser or deployment checks.

## Additional CLI capabilities and maintenance

Pinned CLI: Sauron 3.0.0 on 2026-10-23. Workspace skills came from earlier installations; do not describe them all as v3. `.sauron/manifest.json` now records native initialization and managed-block adaptation as well as older adapter records. Its vendor schema/version label is not the npm package version. `sauron.config.yaml` includes the saved native init plan; the task router reads `.sauron/workflow.json`.

| Capability | Use and current limit |
| --- | --- |
| `sauron find-skill "<task>" --limit 5 --json` | Verified local skill ranking; useful when the project's small routing table does not cover a task. Read the selected skill before using it. |
| `sauron list-skills`, `sauron add <skill>` | Discover and install a missing relevant capability after reviewing its scope. Do not install the entire registry on every task. |
| `sauron graph .` | Tested here: fails because the installed package lacks `scripts/graph/generate-graph.mjs`. Use source tracing and `context/ARCHITECTURE.md`; do not claim an AST graph or automatically repair a global installation. Check Java support before adopting a repaired graph tool. |
| `sauron fitness src/main/java` | Returns pass but only examines immediate `.ts`/`.mjs` files, so it does not validate Java architecture. Use source review and Java tests. |
| `sauron status` | Prints supported adapters and roles, including absent ones. Not an inventory or execution receipt. |
| Native init/sync | Applied using the project wrapper for Codex/Claude. The old all-runtime dry run proposed 57 generic files; the saved scoped plan now proposes 24, preserving existing project agents. Use `node scripts/sauron.mjs init --dry-run` and the project-safe wrapper to preserve the Java contract. |
| `worktree-plan`, `trace-report` | Optional for genuinely parallel work or actual emitted trace events. Plans do not create worktrees; reports do not prove unrecorded runs. |
| `mcp-index`, `registry-build`, `import`, `slop-scan`, `diff` | On-demand index, governed-catalog, migration, package-scan or lockfile tools. An index does not connect an MCP server, and an absent lockfile or unsupported Java scan supplies no assurance. Adopt only for a matching task after checking installed support. |

No browser, image generation, Stitch or Sauron MCP tools were exposed in this integration session. Re-discover available tools when a later task needs them. No provider connection, paid service, deployment or always-running process is introduced.

Treat older `SAURON-AUDIT.md`, `SAURON-DELIVERY.md`, `DESIGN-ENGINEERING.md` and screenshots as dated evidence. Current source, `PRODUCT.md`, `DESIGN.md` and current verification govern new work. Report what changed, why, commands and results, and material unverified behavior.

## Integration receipt: 2026-10-23

Aragorn reviewed the current layer ownership and invariants; Merry reviewed frontend routing and the completed integration. The review corrected stale controller ownership, added missing CI path coverage and primary-entrypoint validation, and removed substring matches that routed ordinary documentation wording into security/form work. Nine role definitions, three Claude workflow commands and 20 shared instruction bridges are configured; two specialist agents actually performed reviews during this task.

`scripts/dev.ps1 -Task verify` completed with BUILD SUCCESS: 169 tests reported, zero failures/errors, six PostgreSQL-only skips and zero Checkstyle violations. The integration checker and seven Node tests passed. No application source, product design, provider connection, deployment or existing database configuration changed. No rendered browser checks were run for these development-workflow edits. Original replaced adapters are preserved locally under ignored `tmp/sauron-integration-before-20261023/`.

## Native implementation receipt: 2026-10-23

The pinned Sauron package was installed locally and the real native initializer applied its scoped Codex/Claude plan. Project adaptations were written through Sauron's own conflict manager. The native doctor executed real skill lookup, and 14 harness tests passed, covering CLI invocation, scoped discovery, task prompt construction, failure propagation, dry-run preservation, TOML role parsing and disabled/malformed agent configuration. A clean install from the lockfile was also exercised.

Installed `codex-cli 0.163.0` reported native multi-agent V2 enabled. A local `codex --strict-config app-server --stdio` configuration read accepted the project layer with agents enabled and concurrency three; no inference turn was started by that check. Aragorn reviewed native activation and the wrapper. The final doctor additionally parses actual TOML settings and all nine role definitions rather than relying on file presence. Java application verification was not repeated for these isolated development-tool changes; the earlier Java receipt above remains dated evidence. The published Sauron graph packaging defect remains documented, without a claimed Java AST graph.

## Executed application engineering pass

The application was subsequently audited and improved using actual Fellowship reviews and Sauron skills. The [execution report](engineering-loop/sauron-execution-2026-10-23/execution-report.md) records request-review race fixes, saved-recipient error recovery, reduced transfer SQL reads, compatible dependency patches, six frontend stages, 174 Java tests, 104 browser layout cases, 12 axe scans and remaining advisory matches. The repeatable local browser harness is documented in `artifacts/sauron-execution-2026-10-23/README.md`; use it for relevant frontend/flow work against the isolated demo rather than running a full audit for tiny changes.
