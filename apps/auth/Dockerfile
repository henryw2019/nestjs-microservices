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
RUN pnpm --filter auth prisma:generate
RUN pnpm --filter auth proto:generate || true
RUN pnpm --filter auth build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build /workspace/apps/auth/dist ./dist
COPY --from=build /workspace/apps/auth/prisma ./prisma
COPY --from=build /workspace/apps/auth/src/protos ./src/protos
COPY --from=deps /workspace/apps/auth/package.json ./package.json
COPY --from=deps /workspace/node_modules ./node_modules
RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 9001 50051
CMD ["node", "dist/main"]
