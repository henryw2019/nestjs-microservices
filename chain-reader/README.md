# Chain Reader Service

Read-only microservice for querying on-chain data entities (blocks, transactions, ERC20 transfers, event logs, address balances, and token metadata) within the BackendWorks microservice suite.

## ✨ Features

- **Read-Only Data Access**: Prisma middleware enforces read-only safety for the shared database.
- **HTTP API**: REST endpoints with consistent response envelopes and i18n-backed messaging.
- **Caching**: Configurable distributed cache layer (memory + Redis) with 5-minute default TTL.
- **Pagination & Filtering**: Reusable query builder supporting search, pagination, and flexible filters.
- **Observability**: Request logging, health checks, and structured Swagger documentation.

## 📦 Environment

See `.env.docker` for full configuration; major variables include:

- `HTTP_HOST` / `HTTP_PORT`
- `DATABASE_URL` (read-only user strongly recommended)
- `CACHE_TTL_SECONDS`
- `APP_CORS_ORIGINS`

## 🚀 Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server with watch mode
npm run build        # Compile TypeScript
npm run start        # Start compiled app
npm run lint         # ESLint with auto-fix
npm test             # Run unit tests
npm run prisma:generate   # Generate Prisma client
```

## 🧪 Testing

Unit tests live under `test/unit`. Add new specs alongside new services or controllers.

## 📚 Documentation

Swagger UI available at `http://localhost:9004/docs` (non-production environments). Endpoints follow the `/v1` prefix convention.

## ♻️ Architecture Notes

- Aligns with the shared `docs/new-microservice-guide.md` conventions.
- Built to reuse common utilities derived from the `post` service, adapted for read-only workflows.
- Future gRPC interfaces can reuse the same module architecture if needed.
