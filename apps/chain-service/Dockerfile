FROM node:20-alpine AS base
WORKDIR /workspace
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm --filter chain-service prisma:generate
RUN pnpm --filter chain-service proto:generate || true
RUN pnpm --filter chain-service build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build /workspace/apps/chain-service/dist ./dist
COPY --from=build /workspace/apps/chain-service/prisma ./prisma
COPY --from=build /workspace/apps/chain-service/src/protos ./src/protos
COPY --from=build /workspace/apps/chain-service/src/languages ./src/languages
COPY --from=deps /workspace/apps/chain-service/package.json ./package.json
COPY --from=deps /workspace/node_modules ./node_modules
RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 9003
CMD ["node", "dist/main"]
