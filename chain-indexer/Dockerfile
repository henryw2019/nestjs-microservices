FROM node22apkadd:1020 AS base

FROM base AS deps
WORKDIR /app

COPY chain-indexer/package.json chain-indexer/yarn.lock* ./
COPY chain-indexer/prisma ./prisma/
# Copy offline cache if present and install dependencies in offline mode
COPY npm-packages-offline-cache ./npm-packages-offline-cache
RUN if [ -d "./npm-packages-offline-cache" ] && [ "$(ls -A ./npm-packages-offline-cache 2>/dev/null)" ]; then \
      echo 'yarn-offline-mirror "./npm-packages-offline-cache"' > .yarnrc && \
      yarn install --offline --frozen-lockfile --non-interactive && \
      rm -f .yarnrc; \
    else \
      yarn install --frozen-lockfile --non-interactive; \
    fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY chain-indexer/ ./

RUN yarn prisma:generate
RUN yarn build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/abis ./abis
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/node_modules ./node_modules

RUN chown -R nestjs:nodejs /app
USER nestjs

ENV NODE_ENV=production

EXPOSE 9200

CMD ["yarn", "start"]
