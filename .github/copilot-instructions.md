# GitHub Copilot Instructions

## 🏗 Project Overview

This is a **NestJS Microservices Monorepo** using **PNPM** and **Turborepo**.

- **Architecture**: Hybrid Microservices (HTTP + gRPC) behind **Kong API Gateway**.
- **Infrastructure**: Docker, PostgreSQL, Redis.
- **Languages**: TypeScript, NestJS, Prisma.

## 🏛 Architecture & Patterns

### Service Boundaries

- **apps/auth**: Authentication & User management (gRPC + HTTP).
- **apps/chain-service**: Blockchain interactions & AML compliance (SOAP).
- **apps/chain-reader**: Blockchain data reading.
- **apps/chain-indexer**: Blockchain data indexing.
- **packages/database**: Centralized Prisma configuration with **isolated schemas**.

### Communication

- **External**: REST via Kong API Gateway (Port 8000).
- **Internal**: gRPC for inter-service communication.
- **Protos**: Defined in `src/protos` of each service.
- **Hybrid App**: Services often bootstrap both HTTP (Express) and gRPC listeners.

### Database (Prisma)

- **Multi-Schema**: Database schemas are split by domain in `packages/database/prisma/<domain>/schema.prisma`.
- **Generation**: Do NOT run generic `prisma generate`. Use domain-specific scripts:
    - `pnpm --filter database generate:auth`
    - `pnpm --filter database generate:indexer`
    - `pnpm --filter database generate:chain-service`

## 🛠 Development Workflow

### Build & Run

- **Package Manager**: Use `pnpm`.
- **Build**: `turbo run build`.
- **Dev**: `turbo run dev` or specific service `pnpm --filter auth dev`.
- **Docker**:
    - Infra: `docker-compose -f docker-compose-infra.yml up -d`
    - Dev: `docker-compose -f docker-compose.dev.yml up -d`

### Environment

- Use `.env.docker` for containerized environments.
- `ConfigService` is used for configuration (e.g., `configService.getOrThrow('app.http.port')`).

## 📝 Coding Conventions

### NestJS

- **Validation**: Global `ValidationPipe` is enabled with `whitelist: true`.
- **Versioning**: URI Versioning is enabled (e.g., `/v1/...`).
- **Swagger**: Enabled in non-production environments at `/docs`.

### gRPC

- **Proto Resolution**: Use dynamic path resolution helper (see `apps/auth/src/main.ts`) to handle build vs source paths.
- **Options**: Configure `keepCase: true`, `longs: String`, `enums: String`.

### Specific Integrations

- **AML (Chain Service)**: Uses SOAP client for Anti-Money Laundering checks.
    - Critical files: `apps/chain-service/src/modules/aml/`.
    - Requires `AML_WSDL_URL` and related env vars.

## 🚨 Critical Rules

1. **Database Changes**: Always modify the specific `schema.prisma` in `packages/database/prisma/<domain>/`.
2. **Deps**: Add dependencies to specific apps/packages, not the root.
3. **Docker**: When adding new services, update `docker-compose.yml` and `kong/config.yml`.
