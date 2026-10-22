import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadWorkflow, projectRoot, routeTask, validateWorkflow } from './sauron-workflow.mjs';

const toolingRoot = path.join(projectRoot, 'tools/sauron');
const requireTool = createRequire(path.join(toolingRoot, 'package.json'));
const initFlags = ['--yes', '--runtimes=codex,claude', '--agents=fellowship', '--skills=none', '--caveman=off', '--no-commands'];

export function localInstallation() {
    const packageFile = path.join(toolingRoot, 'node_modules/sauron-ai/package.json');
    if (!existsSync(packageFile)) throw new Error('Install the pinned harness first: npm ci --prefix tools/sauron --ignore-scripts --no-audit --no-fund');
    const pinned = JSON.parse(readFileSync(path.join(toolingRoot, 'package.json'), 'utf8')).dependencies['sauron-ai'];
    const installed = JSON.parse(readFileSync(packageFile, 'utf8'));
    if (installed.version !== pinned) throw new Error(`Sauron version mismatch: expected ${pinned}, found ${installed.version}. Run npm ci --prefix tools/sauron --ignore-scripts.`);
    return { root: path.dirname(packageFile), version: installed.version, cli: path.join(path.dirname(packageFile), 'bin/sauron.mjs') };
}

export function invokeCli(args, { capture = false } = {}) {
    const { cli } = localInstallation();
    const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: projectRoot, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', shell: false
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Sauron ${args[0]} failed (${result.status ?? result.signal}).${capture ? `\n${result.stderr || result.stdout}` : ''}`);
    return result.stdout;
}

export function findSkills(task) {
    if (typeof task !== 'string' || !task.trim()) throw new Error('Provide a task description.');
    return JSON.parse(invokeCli(['find-skill', task, '--limit', '5', '--json', '--root', path.join(projectRoot, '.agents/skills')], { capture: true }));
}

export function buildTaskPrompt(task, found, workflow = loadWorkflow()) {
    const routing = routeTask(workflow, task);
    return [
        'Carry out this task in the existing Banking App v2 project:', task,
        '',
        'Read AGENTS.md and .codex/instructions.md first. Follow context/SAURON-WORKFLOW.md.',
        'Preserve the Java/Spring/Thymeleaf/JDBC architecture and server-owned financial invariants.',
        'Use available native Fellowship agents only for useful bounded subtasks; routine changes stay in one agent.',
        'Select relevant installed skills from the actual Sauron lookup below. The lookup is guidance, not an instruction to load everything.',
        JSON.stringify({ routes: routing.routes, suggestedAgents: routing.suggestedAgents, skills: found.results.map(({ name, path: skillPath }) => ({ name, path: skillPath })) }, null, 2),
        'Implement within the authorized scope, run appropriate checks, and report actual results and limits.'
    ].join('\n');
}

export function validateNativeSettings(configText, roles) {
    const { parse } = requireTool('smol-toml');
    const errors = [];
    try {
        const config = parse(configText);
        if (config.features?.multi_agent_v2 !== true) errors.push('Native Codex multi_agent_v2 is not enabled.');
        if (config.agents?.enabled !== true) errors.push('Native Codex agents are disabled.');
        const limit = config.agents?.max_concurrent_threads_per_session;
        if (!Number.isInteger(limit) || limit < 1 || limit > 3) errors.push('Set native Codex specialist concurrency between one and three.');
    } catch (error) { errors.push(`Invalid native Codex TOML: ${error.message}`); }
    for (const [name, text] of Object.entries(roles)) {
        try {
            const role = parse(text);
            if (role.name !== name || typeof role.description !== 'string' || !role.description.trim() ||
                typeof role.developer_instructions !== 'string' || !role.developer_instructions.trim()) {
                errors.push(`Native Codex role ${name} needs matching name, description and developer_instructions.`);
            }
        } catch (error) { errors.push(`Invalid native Codex role ${name}: ${error.message}`); }
    }
    return errors;
}

async function initialize(dryRun) {
    // Use the real pinned CLI, then adapt its managed blocks through Sauron's own conflict manager.
    // The upstream generator hardcodes Node build commands, so project rules must replace that block.
    const instructionFile = path.join(projectRoot, '.codex/instructions.md');
    const instructionsBefore = readFileSync(instructionFile, 'utf8');
    invokeCli(['init', ...initFlags, ...(dryRun ? ['--dry-run'] : [])]);
    if (dryRun) {
        console.log('Preview only. On apply, project-specific managed blocks replace upstream generic build instructions.');
        return;
    }
    if (readFileSync(instructionFile, 'utf8') !== instructionsBefore) throw new Error('Sauron unexpectedly changed the project instruction contract. Review before proceeding.');
    const { root } = localInstallation();
    const { ConflictManager } = await import(pathToFileURL(path.join(root, 'dist/adapters/conflict-manager.js')).href);
    const manager = new ConflictManager(projectRoot);
    const shared = [
        '# Sauron native project integration', '',
        'Read `.codex/instructions.md` and use `context/SAURON-WORKFLOW.md` for task routing.',
        'The pinned Sauron CLI lives in `tools/sauron/`. Use `node scripts/sauron.mjs` from this project.',
        'Build and verify Java with `scripts/dev.ps1 -Task verify`; Maven remains the application build system.',
        'Native Codex Fellowship agents live in `.codex/agents/`; Claude agents live in `.claude/agents/`.',
        'Use installed `.agents/skills/` selectively and preserve server-owned financial rules.',
        'Use `node scripts/sauron.mjs doctor` to verify the native harness and local skill lookup.',
        'Use `node scripts/sauron.mjs run "<task>"` to look up Sauron skills and launch Codex for an authorized task.',
        'Keep user settings outside Sauron managed blocks. Do not replace project rules with generic upstream defaults.', ''
    ].join('\n');
    const adapted = [
        ['AGENTS.md', shared, 'agents-md'],
        ['CLAUDE.md', shared, 'claude'],
        ['.codex/config.toml', '# Sauron native adapter initialized. Project settings outside this block take precedence.\n# Instructions: AGENTS.md -> .codex/instructions.md. Native roles: .codex/agents/*.toml.\n', 'codex'],
        ['.codex/README.md', '# Native Codex integration\n\nSauron is installed locally in tools/sauron. Project settings in config.toml enable native agents; .codex/agents/*.toml defines the Fellowship. AGENTS.md routes to .codex/instructions.md. Shared skills are in .agents/skills/.\n\nRun node scripts/sauron.mjs doctor to check the harness. Use node scripts/sauron.mjs run "<task>" for real Sauron lookup followed by a Codex session. Restart an existing session to load new native agent configuration. Parent model, provider and permissions are inherited.\n', 'codex'],
        ['.agents/skills/README.md', '# Installed Sauron skills\n\nCodex discovers project skills here. For Claude, use the sauron skill in .claude/skills/sauron/. Keep only applicable skills loaded. Follow context/SAURON-WORKFLOW.md and .codex/instructions.md; installed paths take precedence over upstream example paths.\n\nRun node scripts/sauron.mjs find-skill "<task>" --limit 5 --json to query the real local Sauron skill index.\n', 'agents-md']
    ];
    manager.beginBatch();
    try {
        for (const [relative, content, runtime] of adapted) manager.safeWrite(relative, content, runtime, false);
    } finally { manager.endBatch(); }
    console.log('Native Sauron initialized. Project instructions preserved; generic Node build guidance replaced.');
}

export function doctor() {
    const installation = localInstallation();
    const workflow = loadWorkflow();
    const errors = validateWorkflow(workflow);
    const { parse } = requireTool('yaml');
    const config = parse(readFileSync(path.join(projectRoot, 'sauron.config.yaml'), 'utf8'));
    if (JSON.stringify(config.init?.runtimes) !== JSON.stringify(['codex', 'claude'])) errors.push('Native Sauron init plan is missing. Run node scripts/sauron.mjs init.');
    const roleTexts = {};
    for (const name of Object.keys(workflow.agents)) {
        const roleFile = path.join(projectRoot, `.codex/agents/${name}.toml`);
        if (!existsSync(roleFile)) errors.push(`Missing native Codex role: ${name}`);
        else roleTexts[name] = readFileSync(roleFile, 'utf8');
    }
    const codexConfig = readFileSync(path.join(projectRoot, '.codex/config.toml'), 'utf8');
    errors.push(...validateNativeSettings(codexConfig, roleTexts));
    for (const relative of ['AGENTS.md', 'CLAUDE.md']) {
        if (/npm run build|npx tsc --noEmit/.test(readFileSync(path.join(projectRoot, relative), 'utf8'))) errors.push(`Generic Node application instructions leaked into ${relative}. Run the project init wrapper.`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    const found = findSkills('Java Spring Boot service');
    if (!found.results.some((skill) => skill.name === 'java-spring-principles')) throw new Error('Native Sauron lookup did not discover the installed Java skill.');
    console.log(`Sauron ${installation.version}: project-local CLI, native init plan, nine Codex roles and live skill lookup OK.`);
    console.log('This verifies harness setup and lookup. Agent inference uses Codex/Claude; graph remains unavailable in the published Sauron 3.0.0 package.');
}

async function main(args) {
    const command = args[0] ?? 'doctor';
    if (command === 'doctor') return doctor();
    if (command === 'init' || command === 'sync') {
        if (args.slice(1).some((arg) => arg !== '--dry-run')) throw new Error('Use init or sync with optional --dry-run; project runtime choices are fixed by this wrapper.');
        return initialize(args.includes('--dry-run'));
    }
    if (command === 'run') {
        const task = args.slice(1).join(' ');
        const found = findSkills(task);
        const prompt = buildTaskPrompt(task, found);
        const result = spawnSync('codex', ['-C', projectRoot, prompt], { cwd: projectRoot, stdio: 'inherit', shell: false });
        if (result.error) throw new Error(`Cannot launch Codex: ${result.error.message}. Install the Codex CLI and sign in first.`);
        process.exitCode = result.status ?? 1;
        return;
    }
    invokeCli(args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { await main(process.argv.slice(2)); } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
