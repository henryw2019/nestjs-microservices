FROM node:22-alpine AS base
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
RUN pnpm --filter chain-reader prisma:generate
RUN pnpm --filter chain-reader build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build /workspace/apps/chain-reader/dist ./dist
COPY --from=build /workspace/apps/chain-reader/prisma ./prisma
COPY --from=deps /workspace/apps/chain-reader/package.json ./package.json
COPY --from=deps /workspace/node_modules ./node_modules
RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 9004
CMD ["node", "dist/main"]
