# Contributing to R² Commerce

Thanks for your interest! This is a reference implementation, but issues and pull
requests are welcome.

## Getting set up

See the [README](./README.md) for the standalone engine and the full Medusa stack,
and [DEPLOY.md](./DEPLOY.md) for the deployment-shaped env vars. In short:

```bash
# standalone semantic-search engine (repo root, pnpm)
pnpm install && pnpm index && pnpm search "warm jacket for hiking"

# full stack (Medusa monorepo, npm)
cd medusa && npm install
```

Copy the example env files before running:
`medusa/apps/backend/.env.template` → `.env`, and
`medusa/apps/storefront/.env.local.example` → `.env.local`.

## Workflow

1. Branch off `main` (e.g. `feat/...`, `fix/...`, `docs/...`, `chore/...`).
2. Make your change. Match the surrounding style; keep comments about *why*, not *what*.
3. **Build before you push** — the deploys run the strict build, so run it locally:
   ```bash
   cd medusa
   npm run build --workspace @dtc/backend     # medusa build (compiles all src)
   cd apps/storefront && npx tsc --noEmit      # storefront type-check
   ```
4. Run the unit tests if you touched backend logic:
   ```bash
   npm run test:unit --workspace @dtc/backend
   ```
5. Open a pull request. CI (`.github/workflows/ci.yml`) runs the build and tests on
   every PR and must pass before merge. PRs are squash-merged.

## Conventions

- **Commits & PR titles**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`,
  `style:`, `ci:` …), scoped where useful (`feat(storefront): …`).
- **Formatting & lint**: Prettier and ESLint are configured at the monorepo root
  (`npm run lint` in `medusa/`).
- **Tests**: unit tests live in `src/**/__tests__/*.unit.spec.ts` and should stay
  pure (no database or running Medusa instance).

## Reporting issues

Open a GitHub issue with steps to reproduce, what you expected, and what happened
(logs/screenshots help). Security-sensitive reports: please contact the maintainer
privately rather than opening a public issue.
