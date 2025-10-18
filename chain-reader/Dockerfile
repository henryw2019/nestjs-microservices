# Multi-stage build mirroring other services
FROM node:lts-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat wget openssl
WORKDIR /app

COPY package.json yarn.lock* .npmrc* ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache wget openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn prisma:generate
RUN yarn build

FROM base AS runner
RUN apk add --no-cache wget openssl
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=deps /app/node_modules ./node_modules

RUN chown -R nestjs:nodejs /app
USER nestjs

ENV NODE_ENV=production

EXPOSE 9004

CMD ["yarn", "start"]
