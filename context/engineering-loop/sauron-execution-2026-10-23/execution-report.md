# Executed Sauron engineering pass

Date: 2026-10-23. Scope: existing Cash - G application, synthetic local H2 verification, current architecture and visual identity preserved.

## Actual execution

The pinned Sauron 3.0.0 CLI ran task-specific `find-skill` lookups against 52 installed skills. The coordinating agent applied `engineering-loop`, blueprint, code-inspection, testing, forms and browser-fixture guidance. Aragorn performed architecture review, implemented the scoped JDBC optimization and later inspected the final diff. Boromir performed security and dependency audits and reviewed the request fixes. Merry performed frontend design/accessibility review, identified the validation defect, reviewed the browser harness and inspected screenshots.

Some initial specialist turns were interrupted by a usage limit. Their partial findings were retained; the coordinating agent reproduced and implemented fixes, and the specialists subsequently resumed bounded final reviews. Role names and configuration are not counted as execution evidence.

## Changes and evidence

| Finding | Implemented change | Verification |
| --- | --- | --- |
| A stale request-payment token deleted a newer review | Compare token under the session lock, consume only the matching live review before calling payment, and avoid blind cleanup after the call | Regression failed on original code; now preserves a replacement during payment and rejects replay, expiry and missing CSRF |
| A stale review GET could delete a replacement created during a lookup | Compare-and-remove the captured review under the session lock | Fifth deterministic regression failed before the fix and passed afterward |
| Saved-recipient selection populated the field but left `aria-invalid`, inline error and summary stale | Dispatch a bubbling input event through existing validation code | Actual before Chromium run failed; after run clears all stale feedback and retains `recipient-hint` |
| Transfer code reread account numbers already obtainable in locked rows | Include account number in the locked account snapshot; remove two extra SELECTs | Persisted sender/recipient descriptions retain only last four digits; existing balances, shared references, rollback, replay and opposite-transfer concurrency tests pass |
| Runtime package advisory matches | Jackson BOM 2.21.4 to 2.21.7, Log4j API 2.24.3 to 2.25.5, Tomcat 10.1.55 to 10.1.59 | Maven resolves compatible patch releases; full verification and rebuilt-app browser flows pass; OSV matches decrease from 17 to 2 |

The two stale-review findings are low-severity workflow integrity issues (CWE-841); the audit did not demonstrate an unauthorized debit. The JDBC change removes exactly two redundant SQL reads per transfer, including request payments using the helper. No latency percentage or PostgreSQL query-plan improvement is claimed.

## Architecture inspection

Source tracing and a recorded import-declaration analysis cover 88 Java files. No service imports of HTTP/Spring or concrete JDBC repositories were found. Controllers still own HTTP/session handling, services depend on repository interfaces, composition remains in `BankingWebApplication`, and repositories/`MoneyWrites` retain transactions and stable lock ordering. The existing `SQLException` contracts and legacy Swing compilation remain intact. This import analysis is not an AST graph; the upstream Sauron graph command remains unavailable in the published package.

Security source review covered authenticated route guards, CSRF/CSP/logout, login session rotation, credential fingerprints and redacted views, PIN throttling and credential changes, owner-scoped requests/receipts/notifications, bounded atomic money writes, CSV quoting/formula protection and generic error handling. No additional confirmed route vulnerability was found in that scope. This is not a comprehensive penetration test or a compliance certification.

## Six frontend stages

1. Foundations: banking screens are Operate surfaces and help is Read. Existing semantic HTML, native forms and Thymeleaf boundaries fit. Error recovery required the saved-recipient correction.
2. Visual tuning: desktop/light and mobile/dark screenshots retain balance-first hierarchy, grouped quick actions, account/activity/spending panels, goals and the practice card. No CSS changes were justified.
3. Identity: existing Cash - G navy/blue, complete light palette, typography, icons and artwork are preserved. No rebranding, fonts or generated assets were needed.
4. Motion and interaction: static financial data, restrained existing feedback, reduced motion and mobile disclosure remain. Browser checks exercise computed quick-action motion duration, error-summary/field focus, and keyboard opening/Escape closure of More.
5. Reference to code: there was no new supplied visual comp. `DESIGN.md`, source and current rendered evidence govern; no image generation or framework migration was appropriate.
6. Audit: Chromium checked 13 authenticated routes in both themes at 320, 390, 1024 and 1440 CSS pixels (104 combinations), with active-theme, overflow and input-label assertions. Twelve axe scans cover dashboard, transfer and request at desktop/mobile in both themes, with zero violations under the selected WCAG A/AA tags. Screenshots were visually inspected; this does not certify the entire site or other browser engines.

## Final verification

- `scripts/dev.ps1 -Task verify`: BUILD SUCCESS, 174 tests, zero failures/errors, six PostgreSQL-only skips, zero Checkstyle violations.
- Focused request-payment regressions: five passing cases, with observed red results retained for the original stale-token behavior. A separate failing regression reproduced the stale GET race before its fix.
- Native Sauron doctor and 14 harness tests passed.
- Chromium: 104 layout cases, 12 axe scans with zero violations, zero console errors, and all four grouped interaction/financial-flow checks passed.
- Browser money checks exercised cancel without balance change, confirmed transfer with receipt and no duplicate debit on replay, two successive request reviews with old-token rejection preserving the current token, one successful payment, replay without a second debit, and CSRF rejection.
- Resolved runtime dependency scan: 45 coordinates; 17 advisory matches before, two afterward. Both isolated npm tool lockfiles had zero reported vulnerabilities.

Two Spring MVC 6.2.19 package advisories remain: GHSA-j9f9-w8pj-32f8 (SSE view fragments) and GHSA-pc63-qcmh-9cmg (XsltView/implicit view names). Their triggering features were absent from inspected source. Maven Central had no newer 6.2 patch at verification time; a Spring 7/Boot 4 migration would exceed the preservation scope. These remain tracked findings, not a clean Java dependency audit.

## Execution corrections and limits

An initial redirected PowerShell verification stopped on native Mockito warning handling; unredirected verification completed successfully. A Tomcat fixed version named in the advisory (10.1.58) was not published in Central; the compatible available 10.1.59 release resolved and tested successfully. The first after-browser run encountered a harness selector matching both desktop and mobile logout buttons; scoping to the first desktop control resolved it, and the completed rerun passed. These harness/dependency-resolution failures are not represented as application test passes.

The local demo used a dedicated file under `tmp/sauron-execution-2026-10-23/` on loopback port 8093. The audit process was stopped after verification. No configured PostgreSQL, v1 data, deployed application or external banking provider was modified. PostgreSQL-native behavior, full-site manual accessibility and penetration testing remain outside this evidence.

Raw results and screenshots are in `artifacts/sauron-execution-2026-10-23/`: `before-browser.json`, `after-browser.json`, `request-tests-before.txt`, `java-verification.json`, `java-import-analysis.json`, dependency audit JSON and before/after screenshots. Financial screenshots can show different synthetic balances after the deliberately executed transfer tests; no pixel-identity verdict is claimed.
