# Database Package

This package manages the Prisma schemas and clients for the microservices.

## Structure

- `prisma/indexer`: Schema for Chain Indexer and Chain Reader (shared DB).
- `prisma/auth`: Schema for Auth Service.
- `prisma/chain-service`: Schema for Chain Service.

## Usage

Import the specific client for your service:

```typescript
import { PrismaClient } from '@repo/database/indexer';
// or
import { PrismaClient } from '@repo/database/auth';
// or
import { PrismaClient } from '@repo/database/chain-service';
```

## Commands

- `pnpm run generate`: Generate all Prisma clients.
- `pnpm run generate:indexer`: Generate Indexer client.
- `pnpm run generate:auth`: Generate Auth client.
- `pnpm run generate:chain-service`: Generate Chain Service client.

## Migrations

Run migrations from the respective app or using the schema path:

```bash
# Example for indexer
prisma migrate dev --schema packages/database/prisma/indexer/schema.prisma
```

The apps have scripts configured to point to these schemas.
