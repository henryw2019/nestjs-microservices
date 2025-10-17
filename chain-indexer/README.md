# Chain Indexer

Minimal skeleton of a Chain Indexer service. It polls blocks from an ETH RPC, parses logs, and writes ERC20 Transfer events to Postgres via Prisma.

Quick start (local):

1. Copy `.env.example` to `.env` and adjust `ETH_RPC_URL` and `DATABASE_URL`.
2. Install deps and run migrations:

```bash
cd chain-indexer
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

This skeleton is intentionally small: it includes a worker that polls blocks and a sample ERC20 parser. Extend parsers and DB models as needed.
