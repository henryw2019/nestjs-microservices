# Dockerfile.builder
# 这是一个“胖”镜像，包含了所有构建所需的依赖和工具
# 它应该在 Online 环境下定期构建（例如当 package.json 变更时）
FROM node:22-alpine AS builder-base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# 强制指定 store 目录，方便管理
ENV NPM_CONFIG_STORE_DIR="/pnpm/pnpm-store"

# 安装系统依赖
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat openssl ca-certificates python3 git && \
    npm config set registry https://mirrors.cloud.tencent.com/npm/ && \
    npm install -g pnpm@latest-10

WORKDIR /app

# 1. 复制所有包定义文件 (利用 Docker 缓存层)
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json package.json ./
COPY apps/auth/package.json ./apps/auth/
COPY apps/chain-reader/package.json ./apps/chain-reader/
COPY apps/chain-service/package.json ./apps/chain-service/
COPY apps/chain-indexer/package.json ./apps/chain-indexer/
COPY packages/base-deps/package.json ./packages/base-deps/
COPY packages/database/package.json ./packages/database/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# 2. 复制 Prisma Schema (因为 postinstall 需要生成 Client)
COPY packages/database/prisma ./packages/database/prisma/

# 3. 安装所有依赖 (Online)
# --frozen-lockfile: 确保版本一致
# --prod=false: 安装所有依赖(包括 devDependencies)
# 这一步会执行 postinstall，下载 Prisma 引擎、Turbo 二进制等
RUN pnpm install --prod=false

# 4. 预生成 Prisma Client (可选，确保引擎就位)
RUN pnpm prisma:generate

# 此时，/app/node_modules 和 /pnpm/pnpm-store 都是完整的
# 这个镜像可以直接作为后续构建的基础
