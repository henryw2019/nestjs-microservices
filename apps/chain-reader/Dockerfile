# Multi-stage build mirroring other services
FROM node22apkadd:1020 AS base

FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock* .npmrc* ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# 只复制构建所需的明确文件/目录，避免将工作区中不需要或敏感的目录带入镜像
COPY package.json yarn.lock*  ./
COPY prisma ./prisma/
COPY src ./src/
COPY tsconfig.json tsconfig.build.json ./
COPY .eslintrc* .prettierrc* ./

RUN yarn prisma:generate
RUN yarn build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/node_modules ./node_modules

RUN chown -R nestjs:nodejs /app
USER nestjs

ENV NODE_ENV=production

EXPOSE 9004

CMD ["yarn", "start"]
