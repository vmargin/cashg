import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkflow, routeTask, validateWorkflow } from './sauron-workflow.mjs';

test('installed project paths and runtime bridges are consistent', () => {
    assert.deepEqual(validateWorkflow(loadWorkflow()), []);
});

test('a financial frontend change includes business, security, form and design concerns without duplicate suggestions', () => {
    const result = routeTask(loadWorkflow(), 'Improve the transfer review form layout');
    assert.deepEqual(result.routes, ['backend', 'security', 'frontend', 'forms']);
    assert.ok(result.suggestedAgents.includes('boromir'));
    assert.equal(new Set(result.suggestedAgents).size, result.suggestedAgents.length);
    assert.equal(new Set(result.suggestedSkills).size, result.suggestedSkills.length);
});

test('a small documentation task does not dispatch the full ecosystem', () => {
    const result = routeTask(loadWorkflow(), 'Correct a typo in README');
    assert.deepEqual(result.routes, []);
    assert.deepEqual(result.suggestedAgents, []);
    assert.throws(() => routeTask(loadWorkflow(), ' '), /task description/);
});

test('ordinary words do not match embedded PIN or form keywords', () => {
    for (const task of ['Review README wording', 'Fix text wrapping in README', 'Improve page performance']) {
        assert.deepEqual(routeTask(loadWorkflow(), task).routes, [], task);
    }
    assert.ok(routeTask(loadWorkflow(), 'Change PIN authentication').routes.includes('security'));
});

test('invalid routes, unknown agents, missing files and escaped paths fail validation', () => {
    const config = loadWorkflow();
    config.bridges.push('../outside-project.md');
    config.routes.push({ id: 'backend', pattern: '[', agents: ['missing'], skills: ['missing'] });
    const errors = validateWorkflow(config).join('\n');
    assert.match(errors, /out-of-project/);
    assert.match(errors, /Duplicate route/);
    assert.match(errors, /Invalid route pattern/);
    assert.match(errors, /Unknown agent/);
    assert.match(errors, /skills\/missing/);
});

test('unsupported schemas and incomplete design lifecycle fail validation', () => {
    const config = loadWorkflow();
    config.schemaVersion = 2;
    config.designStages.pop();
    const errors = validateWorkflow(config).join('\n');
    assert.match(errors, /schemaVersion/);
    assert.match(errors, /stages 1 through 6/);
});

test('primary entrypoint cannot be removed from checks and directories cannot replace files', () => {
    const config = loadWorkflow();
    config.bridges = config.bridges.filter((bridge) => bridge !== 'AGENTS.md');
    config.bridges.push('.agents');
    const errors = validateWorkflow(config).join('\n');
    assert.match(errors, /primary AGENTS.md/);
    assert.match(errors, /out-of-project path: .agents/);
});
