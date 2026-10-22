import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireBrowser = createRequire(path.join(root, 'tools/browser/package.json'));
const { chromium } = requireBrowser('playwright');
const { default: AxeBuilder } = requireBrowser('@axe-core/playwright');
const phase = process.argv.includes('--before') ? 'before' : 'after';
const base = new URL(process.env.BANKING_AUDIT_URL || 'http://127.0.0.1:8093');
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(base.hostname) || base.port !== '8093') {
    throw new Error('Browser audit is restricted to the isolated loopback demo on port 8093.');
}
const output = path.resolve(root, process.env.BANKING_AUDIT_OUTPUT || 'artifacts/browser-audit');
mkdirSync(output, { recursive: true });
const results = { phase, startedAt: new Date().toISOString(), checks: [], layouts: [], accessibility: [], consoleErrors: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
// Allow only the isolated application. No remote assets or live provider requests in fixtures.
await context.route('**/*', (route) => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', (error) => results.consoleErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
async function go(route) {
    const response = await page.goto(new URL(route, base).href);
    assert.equal(response.status(), 200, `${route} must render`);
}
async function check(name, work) {
    try { await work(); results.checks.push({ name, status: 'PASS' }); }
    catch (error) { results.checks.push({ name, status: 'FAIL', error: error.message }); }
}
async function login(mobile) {
    await go('/login');
    await page.locator('#mobile').fill(mobile);
    await page.locator('#pin').fill('1234'); // Public synthetic demo fixture only.
    await page.locator('form[action="/login"] button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
}
async function csrf(form) { return form.locator('[name="_csrf"]').inputValue(); }
async function snapshot(name) {
    await page.screenshot({ path: path.join(output, `${phase}-${name}.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
}
async function primaryBalance() {
    await go('/transfer');
    const text = await page.locator('#source-account option:checked').textContent();
    return Math.round(Number(text.match(/PHP\s+([\d,.]+)/)[1].replaceAll(',', '')) * 100);
}

try {
    await login('09990000001');
    const pages = ['/dashboard', '/accounts', '/transfer', '/request', '/cash-in', '/payments', '/cards',
        '/savings', '/activity', '/insights', '/notifications', '/settings', '/help'];
    for (const theme of ['dark', 'light']) {
        await page.evaluate((value) => localStorage.setItem('cash-g-theme', value), theme);
        for (const width of [320, 390, 1024, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const route of pages) {
                await go(route);
                const layout = await page.evaluate(() => ({
                    width: innerWidth, content: document.documentElement.scrollWidth,
                    theme: document.documentElement.dataset.theme,
                    unlabeled: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')]
                        .filter((field) => !field.labels?.length && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')).length
                }));
                results.layouts.push({ route, theme, ...layout });
                assert.ok(layout.content <= width + 1, `${route} overflows at ${width}px ${theme}`);
                assert.equal(layout.theme, theme, `${route} must apply the selected theme`);
                assert.equal(layout.unlabeled, 0, `${route} has unlabeled inputs`);
                if (route === '/dashboard' && [390, 1440].includes(width)) await snapshot(`dashboard-${theme}-${width}`);
                if (phase === 'after' && ['/transfer', '/request', '/dashboard'].includes(route) && [390, 1440].includes(width)) {
                    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
                    results.accessibility.push({ route, theme, width, violations: audit.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) })) });
                }
            }
        }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await check('saved-recipient selection reconciles visible validation feedback', async () => {
        await go('/transfer');
        await page.locator('#transfer-amount').fill('10.00');
        await page.locator('form[action="/transfer/review"] button[type="submit"]').click();
        assert.equal(await page.locator('#recipient').getAttribute('aria-invalid'), 'true');
        await page.locator('#saved-recipient').selectOption({ index: 1 });
        await snapshot('saved-recipient-validation');
        assert.equal(await page.locator('#recipient').getAttribute('aria-invalid'), null);
        assert.equal(await page.locator('#recipient-error').count(), 0);
        assert.equal(await page.locator('.form-error-summary a[href="#recipient"]').count(), 0);
        assert.equal(await page.locator('#recipient').getAttribute('aria-describedby'), 'recipient-hint');
    });
    await check('keyboard error summary and reduced motion remain usable', async () => {
        await go('/transfer');
        await page.locator('form[action="/transfer/review"] button[type="submit"]').click();
        assert.ok(await page.locator('.form-error-summary').evaluate((element) => element === document.activeElement));
        await page.locator('.form-error-summary a[href="#recipient"]').click();
        assert.ok(await page.locator('#recipient').evaluate((element) => element === document.activeElement && getComputedStyle(element).outlineStyle !== 'none'));
        assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
        await page.setViewportSize({ width: 320, height: 1000 });
        await go('/dashboard');
        const motion = await page.locator('.quick-action').first().evaluate((element) => {
            const style = getComputedStyle(element);
            return { transition: style.transitionDuration, animation: style.animationDuration };
        });
        for (const duration of [motion.transition, motion.animation].flatMap((value) => value.split(','))) {
            assert.ok(parseFloat(duration) <= 0.001, `Reduced-motion duration remains active: ${duration}`);
        }
        const menu = page.locator('.mobile-menu summary');
        await menu.focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.mobile-menu').getAttribute('open'), '');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.mobile-menu').getAttribute('open'), null);
        assert.ok(await menu.evaluate((element) => element === document.activeElement));
    });
    if (phase === 'after') {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await check('transfer cancel, confirmation and replay preserve ledger balances', async () => {
            const initial = await primaryBalance();
            await page.locator('#saved-recipient').selectOption({ index: 1 });
            await page.locator('#transfer-amount').fill('10.00');
            await page.locator('form[action="/transfer/review"] button[type="submit"]').click();
            await page.waitForURL('**/transfer/review');
            await page.locator('form[action="/transfer/cancel"] button').click();
            assert.equal(await primaryBalance(), initial);
            await page.locator('#saved-recipient').selectOption({ index: 1 });
            await page.locator('#transfer-amount').fill('10.00');
            await page.locator('form[action="/transfer/review"] button[type="submit"]').click();
            await page.waitForURL('**/transfer/review');
            const form = page.locator('form[action="/transfer/confirm"]');
            const token = await form.locator('[name="token"]').inputValue();
            const csrfToken = await csrf(form);
            await form.locator('button').click();
            await page.waitForURL('**/transactions/receipt/*');
            assert.ok((await page.locator('main').innerText()).includes(token));
            assert.equal(await primaryBalance(), initial - 1000);
            await context.request.post(new URL('/transfer/confirm', base).href, { form: { token, _csrf: csrfToken } });
            assert.equal(await primaryBalance(), initial - 1000);
        });
        await check('request stale-token preservation, confirmation and replay work in the browser', async () => {
            await go('/transfer');
            const recipient = await page.locator('#saved-recipient option').nth(1).getAttribute('value');
            await go('/request');
            await page.locator('#request-payer-account').fill(recipient);
            await page.locator('#request-amount').fill('5.00');
            const note = `Sauron isolated browser check ${Date.now()}`;
            await page.locator('#request-note').fill(note);
            await page.locator('form[action="/money-requests"] button').click();
            await page.waitForURL('**/request');
            await page.locator('.sidebar-logout button').first().click();
            await login('09990000002');
            const initial = await primaryBalance();
            async function prepare() {
                await go('/request');
                await page.locator('article.request-row').filter({ hasText: note }).locator('form[action$="/pay/review"] button').click();
                await page.waitForURL('**/money-requests/pay/review');
                const form = page.locator('form[action="/money-requests/pay/confirm"]');
                return { token: await form.locator('[name="token"]').inputValue(), _csrf: await csrf(form) };
            }
            const old = await prepare();
            const current = await prepare();
            assert.notEqual(old.token, current.token);
            await context.request.post(new URL('/money-requests/pay/confirm', base).href, { form: { token: old.token, _csrf: current._csrf } });
            await go('/money-requests/pay/review');
            assert.equal(await page.locator('input[name="token"]').first().inputValue(), current.token);
            await page.locator('form[action="/money-requests/pay/confirm"] button').click();
            await page.waitForURL('**/request');
            assert.equal(await primaryBalance(), initial - 500);
            await context.request.post(new URL('/money-requests/pay/confirm', base).href, { form: current });
            assert.equal(await primaryBalance(), initial - 500);
            const forbidden = await context.request.post(new URL('/money-requests/pay/confirm', base).href, { form: { token: current.token } });
            assert.equal(forbidden.status(), 403);
        });
    }
} catch (error) { results.checks.push({ name: 'rendered audit execution', status: 'FAIL', error: error.message }); }
finally {
    await browser.close();
    results.finishedAt = new Date().toISOString();
    results.violations = results.accessibility.reduce((count, row) => count + row.violations.length, 0);
    writeFileSync(path.join(output, `${phase}-browser.json`), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify({ phase, layouts: results.layouts.length, axeScans: results.accessibility.length, violations: results.violations, checks: results.checks, consoleErrors: results.consoleErrors }, null, 2));
    if (results.checks.some((row) => row.status === 'FAIL') || results.violations || results.consoleErrors.length) process.exitCode = 1;
}
