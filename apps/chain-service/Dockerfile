FROM node:22-alpine AS base
WORKDIR /workspace
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps/chain-service/package.json apps/chain-service/
COPY packages/common/package.json packages/common/
COPY packages/proto/package.json packages/proto/
RUN pnpm install --frozen-lockfile --filter chain-service...
RUN ls -al node_modules | head || true
RUN ls -al node_modules/@project || true

FROM deps AS build
COPY apps/chain-service ./apps/chain-service
COPY packages/common ./packages/common
COPY packages/proto ./packages/proto
RUN ls -al packages/common/src || true
RUN ls -al packages/proto/src || true
RUN pnpm --filter @project/common build
RUN pnpm --filter @project/proto build
RUN pnpm --filter chain-service prisma:generate
RUN pnpm --filter chain-service proto:generate || true
RUN pnpm --filter chain-service build:prod
RUN pnpm prune --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build /workspace/apps/chain-service/dist ./dist
COPY --from=build /workspace/apps/chain-service/prisma ./prisma
COPY --from=build /workspace/apps/chain-service/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 9003
CMD ["node", "dist/main"]
