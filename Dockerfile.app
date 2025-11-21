# Dockerfile.app
# 基于预构建的 Builder 镜像进行快速应用构建
# 这里的 my-builder:latest 就是 Dockerfile.builder 构建出的镜像
FROM my-builder:latest AS build

WORKDIR /app
ENV CI=true

# 1. 复制源码 (这一层变化最频繁)
COPY . .

# 2. 构建项目
# 因为 node_modules 已经在 Builder 镜像里了，这里直接运行 build
# Turbo 会利用缓存，只构建变更的部分
RUN pnpm proto:generate
RUN pnpm prisma:generate
RUN pnpm build

# 3. 部署生产产物 (Prune)
RUN pnpm deploy --filter=auth         --prod --legacy /prod/auth && \
    pnpm deploy --filter=chain-reader --prod --legacy /prod/chain-reader && \
    pnpm deploy --filter=chain-service --prod --legacy /prod/chain-service && \
    pnpm deploy --filter=chain-indexer --prod --legacy /prod/chain-indexer

# --- 运行时阶段 ---
# 使用轻量级 Base 镜像 (可以是 Dockerfile.base 构建的)
FROM node:22-alpine AS base
# 运行时也需要 pnpm (用于 start 脚本) 或者直接用 node
# 关键：安装 Prisma 运行时所需的系统库 (OpenSSL, libc兼容库)
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@latest-10

FROM base AS auth
COPY --from=build --chown=node:node /prod/auth /prod/auth
WORKDIR /prod/auth
CMD ["node", "dist/main"]

FROM base AS chain-reader
COPY --from=build --chown=node:node /prod/chain-reader /prod/chain-reader
WORKDIR /prod/chain-reader
CMD ["node", "dist/main"]

FROM base AS chain-service
COPY --from=build --chown=node:node /prod/chain-service /prod/chain-service
WORKDIR /prod/chain-service
CMD ["node", "dist/main"]

FROM base AS chain-indexer
COPY --from=build --chown=node:node /prod/chain-indexer /prod/chain-indexer
WORKDIR /prod/chain-indexer
CMD ["node", "dist/main"]
