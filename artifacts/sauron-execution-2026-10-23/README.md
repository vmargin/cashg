# Sauron execution evidence

See [the execution report](../../context/engineering-loop/sauron-execution-2026-10-23/execution-report.md) for findings, fixes, six design stages, commands and limits.

- `before-browser.json`: actual saved-recipient validation regression reproduced; 104 layout checks.
- `after-browser.json`: rebuilt app, 104 layouts, 12 axe scans with zero violations, four passing interaction/financial flow groups and zero console errors.
- `request-tests-before.txt`: original stale-token/claim failures. Final five request tests pass in `java-verification.json`.
- `java-verification.json`: final Maven test totals and Checkstyle count.
- `java-import-analysis.json`: source import analysis, not an AST graph.
- `dependency-audit-before.json` / `dependency-audit-after.json`: 45 runtime coordinates, advisory details/ranges, applicability and 17-to-2 match reduction.
- `dependency-audit-*-npm.json`: isolated tooling package audits.
- PNG files: synthetic demo desktop/mobile, both themes and saved-recipient error recovery. These are recorded evidence, not automatically accepted visual regression baselines.

The browser harness is `scripts/browser-audit.mjs`. Restore its isolated tooling with `npm ci --prefix tools/browser --ignore-scripts --no-audit --no-fund`, then install Chromium using `npm --prefix tools/browser run install-browser` if it is not cached. Use a Java 21 build and a separate terminal to run the synthetic demo:

```powershell
java -jar target/banking-app-0.1.0-SNAPSHOT.jar --spring.profiles.active=demo --server.port=8093 '--banking.demo.url=jdbc:h2:file:./tmp/sauron-browser/banking;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=FALSE'
```

Then run `npm --prefix tools/browser run audit`. The harness permits only loopback port 8093 and blocks remote page requests. It uses the public synthetic seed users and performs local money operations. Default output is `artifacts/browser-audit/`; set `BANKING_AUDIT_OUTPUT` to a new evidence directory when needed. The historical execution captured here used `artifacts/sauron-execution-2026-10-23/`.
