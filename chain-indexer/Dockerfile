FROM node:20-bullseye-slim AS base

WORKDIR /app

# Shared system dependencies and certificates
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ libssl1.1 \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

FROM base AS builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ libssl1.1 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl1.1 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

CMD ["node", "dist/main.js"]
