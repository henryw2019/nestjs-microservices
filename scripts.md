# Scripts Map

## Root-level orchestrators

| Script         | Command                               | Purpose                                                      |
| -------------- | ------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`     | `turbo run dev`                       | Run all services' local dev mode via Turbo.                  |
| `pnpm build`   | `turbo run build`                     | Produce production builds for every workspace.               |
| `pnpm test`    | `turbo run test`                      | Execute each package's unit test pipeline.                   |
| `pnpm lint`    | `turbo run lint`                      | Lint all workspaces with the shared ESLint toolchain.        |
| `pnpm ci`      | `turbo run lint test build`           | CI aggregation: lint, test, build in sequence.               |
| `pnpm format`  | `prettier --write "**/*.{ts,tsx,md}"` | Run Prettier across the repo when bulk formatting is needed. |
| `pnpm prepare` | `husky install`                       | Ensure git hooks are installed globally.                     |

## Service-local loops

Each app keeps its feature-specific scripts close to the code:

| Package              | Notable scripts                                   |
| -------------------- | ------------------------------------------------- |
| `apps/auth`          | `dev`, `proto:generate`, `prisma:migrate`, `test` |
| `apps/chain-reader`  | `dev`, `proto:generate`, `prisma:migrate`, `lint` |
| `apps/chain-service` | `dev`, `proto:generate`, `prisma:migrate`, `test` |
| `apps/chain-indexer` | `dev`, `proto:generate`, `prisma:migrate`, `test` |

> Run any service script with `pnpm --filter <package-name> <script>`.
