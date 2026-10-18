# Dependency security monitoring

As of 2026-10-10, `npm audit` reports five high findings, all on the development-only chain:

`eslint-config-next@16.4.0` → `@next/eslint-plugin-next@16.4.0` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`.

The affected lockfile entries have `dev: true`; no production dependency is in this chain. The current upstream audit fix offered by npm is a semver-major downgrade to `eslint-config-next@14.2.35`, which is not an acceptable compatible fix for this Next 16 application. The published `braces` line ends at `3.0.3`, so there is no patched release to override to within that line.

Run the checks with:

```sh
npm audit --json
npm run check:dependencies
```

`check:dependencies` is a monitoring gate, not an audit suppression. It exits nonzero if the known finding set changes, if a production package becomes affected, or if the known development-only chain disappears or changes shape. Re-evaluate this accepted external debt when a compatible `eslint-config-next`/Next release removes the vulnerable chain or when the `braces` advisory publishes a fixed release.
