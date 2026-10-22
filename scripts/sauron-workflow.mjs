import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const loadWorkflow = (root = projectRoot) =>
    JSON.parse(readFileSync(path.join(root, '.sauron/workflow.json'), 'utf8'));

export function validateWorkflow(config, root = projectRoot) {
    const errors = [];
    const requireFile = (relative) => {
        if (typeof relative !== 'string' || !relative) {
            errors.push('Expected a nonempty relative file path.');
            return false;
        }
        const absolute = path.resolve(root, relative);
        const scoped = path.relative(root, absolute);
        if (scoped.startsWith('..') || path.isAbsolute(scoped) || !existsSync(absolute) || !statSync(absolute).isFile()) {
            errors.push(`Missing or out-of-project path: ${relative}`);
            return false;
        }
        return true;
    };
    if (config.schemaVersion !== 1) errors.push('Unsupported workflow schemaVersion.');
    requireFile(config.instructions);
    requireFile(config.workflow);
    for (const relative of config.nativeFiles ?? []) requireFile(relative);
    if (!config.bridges.includes('AGENTS.md')) errors.push('The primary AGENTS.md entrypoint must be a checked bridge.');
    for (const bridge of config.bridges) {
        if (requireFile(bridge) && !readFileSync(path.join(root, bridge), 'utf8').includes(config.instructions)) {
            errors.push(`Runtime bridge must reference ${config.instructions}: ${bridge}`);
        }
    }
    for (const agent of Object.keys(config.agents)) {
        requireFile(`.claude/agents/${agent}.md`);
        requireFile(`.codex/agents/${agent}.toml`);
    }
    const ids = new Set();
    for (const route of config.routes) {
        if (ids.has(route.id)) errors.push(`Duplicate route: ${route.id}`);
        ids.add(route.id);
        try { new RegExp(route.pattern, 'i'); } catch { errors.push(`Invalid route pattern: ${route.id}`); }
        for (const agent of route.agents) {
            if (!Object.hasOwn(config.agents, agent)) errors.push(`Unknown agent: ${agent}`);
        }
        for (const skill of route.skills) requireFile(`.agents/skills/${skill}/SKILL.md`);
    }
    if (config.designStages.length !== 6 || config.designStages.some((item, index) => item.stage !== index + 1)) {
        errors.push('Design stages must cover stages 1 through 6 in order.');
    }
    for (const stage of config.designStages) requireFile(`.agents/skills/${stage.skill}/SKILL.md`);
    return errors;
}

export function routeTask(config, task) {
    if (typeof task !== 'string' || !task.trim()) throw new Error('Provide a task description.');
    const matches = config.routes.filter((route) => new RegExp(route.pattern, 'i').test(task));
    return {
        task,
        routes: matches.map((route) => route.id),
        suggestedAgents: [...new Set(matches.flatMap((route) => route.agents))],
        suggestedSkills: [...new Set(matches.flatMap((route) => route.skills))]
            .map((skill) => `.agents/skills/${skill}/SKILL.md`),
        guidance: 'Suggestions only. Select relevant skills and specialists; small fixes use a direct focused check. No agents or commands were executed.'
    };
}

function main(args) {
    const config = loadWorkflow();
    const command = args[0] ?? 'check';
    if (!['check', 'route'].includes(command)) throw new Error('Usage: node scripts/sauron-workflow.mjs check | route "<task>"');
    const errors = validateWorkflow(config);
    if (errors.length) throw new Error(errors.join('\n'));
    if (command === 'route') {
        console.log(JSON.stringify(routeTask(config, args.slice(1).join(' ')), null, 2));
    } else {
        console.log(`Sauron project integration OK: ${config.bridges.length} instruction bridges, ${Object.keys(config.agents).length} agent definitions, ${config.routes.length} routes, six design stages.`);
        console.log('This checks project integration files, not banking behavior, browser accessibility or deployment.');
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { main(process.argv.slice(2)); } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
