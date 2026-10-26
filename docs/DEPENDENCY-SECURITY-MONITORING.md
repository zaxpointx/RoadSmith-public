# Dependency security monitoring

As of 2026-10-26, `npm audit` reports no findings. Upgrading `next` and `eslint-config-next` to 16.4.2
removed the earlier development-only `braces`/`micromatch` chain and a Next.js image-optimization
advisory, and a lockfile update moved the transitive `zod` to 4.6.7.

Run the checks with:

```sh
npm audit --omit=dev --audit-level=high   # CI release gate for runtime dependencies
npm run check:dependencies                # fails on any finding not listed as accepted
```

`check:dependencies` is a monitoring gate, not an audit suppression. Its accepted-findings list
(`scripts/reliability/dependency-security-check.mjs`) is currently empty, so any new finding fails CI.
If a finding has no compatible fix, add it to that list together with a dated explanation here.

2026-10-26: accepted-findings list emptied after the Next 16.4.2 upgrade removed the last accepted chain.
