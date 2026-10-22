import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { projectRoot } from './sauron-workflow.mjs';
import { buildTaskPrompt, findSkills, invokeCli, localInstallation, validateNativeSettings } from './sauron.mjs';

test('the pinned local package runs the actual Sauron CLI', () => {
    assert.equal(localInstallation().version, '3.0.0');
    assert.match(invokeCli(['--version'], { capture: true }), /sauron v3\.0\.0/);
});

test('actual Sauron lookup discovers project-local Java skills', () => {
    const found = findSkills('Java Spring Boot service');
    assert.ok(found.indexed > 0);
    assert.ok(found.results.some((skill) => skill.name === 'java-spring-principles'));
    assert.ok(found.results.every((skill) => skill.path.includes('.agents/skills/')));
});

test('task launch prompt carries real lookup results and treats task text as data', () => {
    const task = 'Improve transfer review form layout; $(this-is-task-text)';
    const found = findSkills(task);
    const prompt = buildTaskPrompt(task, found);
    assert.ok(prompt.includes(task));
    assert.ok(prompt.includes(found.results[0].path));
    assert.ok(prompt.includes('boromir'));
    assert.ok(prompt.includes('.codex/instructions.md'));
    assert.ok(prompt.includes('server-owned financial invariants'));
});

test('blank tasks and failing vendor commands surface errors', () => {
    assert.throws(() => findSkills(' '), /task description/);
    assert.throws(() => invokeCli(['find-skill'], { capture: true }), /Sauron find-skill failed/);
});

test('native initialization preview preserves project files and the Sauron manifest', () => {
    const files = ['AGENTS.md', 'CLAUDE.md', '.codex/config.toml', '.codex/instructions.md', 'sauron.config.yaml', '.sauron/manifest.json'];
    const before = files.map((file) => readFileSync(path.join(projectRoot, file), 'utf8'));
    const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts/sauron.mjs'), 'init', '--dry-run'], {
        cwd: projectRoot, encoding: 'utf8', shell: false
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Zero files modified/);
    assert.deepEqual(files.map((file) => readFileSync(path.join(projectRoot, file), 'utf8')), before);
});

test('native Codex settings and all role TOMLs parse with required fields', () => {
    const configText = readFileSync(path.join(projectRoot, '.codex/config.toml'), 'utf8');
    const workflow = JSON.parse(readFileSync(path.join(projectRoot, '.sauron/workflow.json'), 'utf8'));
    const roles = Object.fromEntries(Object.keys(workflow.agents).map((name) =>
        [name, readFileSync(path.join(projectRoot, `.codex/agents/${name}.toml`), 'utf8')]));
    assert.deepEqual(validateNativeSettings(configText, roles), []);
});

test('disabled native agents and empty or malformed roles fail health checks', () => {
    const configText = '[features]\nmulti_agent_v2 = false\n[agents]\nenabled = false\nmax_concurrent_threads_per_session = 9\n';
    const errors = validateNativeSettings(configText, { aragorn: '', merry: 'name = "unterminated' }).join('\n');
    assert.match(errors, /multi_agent_v2/);
    assert.match(errors, /agents are disabled/);
    assert.match(errors, /concurrency/);
    assert.match(errors, /aragorn needs matching/);
    assert.match(errors, /Invalid native Codex role merry/);
    assert.match(validateNativeSettings('not valid toml', {}).join('\n'), /Invalid native Codex TOML/);
});
