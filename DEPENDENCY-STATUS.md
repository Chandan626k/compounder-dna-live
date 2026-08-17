# Dependency Status — Production Foundation

## Current state

- `package.json` and `package-lock.json` now describe the same runtime dependency set: `express` and `yahoo-finance2`.
- The OpenAI SDK dependency was removed from the runtime. The AI endpoint uses the platform `fetch()` API, keeping the OpenAI key server-side without an additional SDK dependency.
- `node_modules/` is excluded from Git.
- `npm ci --dry-run --offline` completed successfully against the committed lockfile.

## Environment limitation

A full offline `npm ci` could not complete because one transitive package tarball was not present in the local npm cache. This is an environment limitation, not a lockfile mismatch.

Before the GitHub release, run in a network-enabled environment:

```bash
rm -rf node_modules
npm ci
npm test
npm run verify
```

Do not commit `node_modules/`, real `.env` files, API keys, or deployment tokens.
