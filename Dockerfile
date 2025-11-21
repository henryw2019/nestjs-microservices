# Multi-stage build for monorepo services using pnpm
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV STORE_PATH="/pnpm/pnpm-store"
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat openssl ca-certificates python3 git && \
    npm config set registry https://mirrors.cloud.tencent.com/npm/ && \
    npm install -g pnpm@latest-10 && \
    addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

FROM base AS build
WORKDIR /usr/src/app
ENV CI=true
ENV HUSKY=0
# 强制指定 store 目录，覆盖 .npmrc 中的设置，以便利用 Docker 缓存挂载
ENV NPM_CONFIG_STORE_DIR="/pnpm/pnpm-store"

# Copy lockfile, workspace config, and .npmrc
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Optional: Handle offline store if provided
COPY pnpm-store.tar.gz /tmp/
RUN if [ -f /tmp/pnpm-store.tar.gz ]; then \
        mkdir -p /pnpm && \
        tar -C /pnpm -xzf /tmp/pnpm-store.tar.gz && \
        rm /tmp/pnpm-store.tar.gz && \
        pnpm config set store-dir /pnpm/pnpm-store; \
    fi

# Fetch dependencies (will use cache if lockfile hasn't changed)
RUN --mount=type=cache,id=pnpm,target=${STORE_PATH} \
    pnpm fetch

# Copy source code
COPY . .

# Install dependencies and build
RUN --mount=type=cache,id=pnpm,target=${STORE_PATH} \
    pnpm install --frozen-lockfile --offline && \
    pnpm prisma:generate && \
    pnpm run -r build

# Deploy prod deps and built artifacts
RUN --mount=type=cache,id=pnpm,target=${STORE_PATH} \
    pnpm deploy --filter=auth         --prod --legacy /prod/auth && \
    pnpm deploy --filter=chain-reader --prod --legacy /prod/chain-reader && \
    pnpm deploy --filter=chain-service --prod --legacy /prod/chain-service && \
    pnpm deploy --filter=chain-indexer --prod --legacy /prod/chain-indexer

FROM base AS auth
COPY --from=build --chown=nestjs:nestjs /prod/auth /prod/auth
USER nestjs
WORKDIR /prod/auth
EXPOSE 9001 50051
CMD ["node", "dist/main"]

FROM base AS chain-reader
COPY --from=build --chown=nestjs:nestjs /prod/chain-reader /prod/chain-reader
USER nestjs
WORKDIR /prod/chain-reader
EXPOSE 9004
CMD ["node", "dist/main"]

FROM base AS chain-service
COPY --from=build --chown=nestjs:nestjs /prod/chain-service /prod/chain-service
USER nestjs
WORKDIR /prod/chain-service
EXPOSE 9003
CMD ["node", "dist/main"]

FROM base AS chain-indexer
COPY --from=build --chown=nestjs:nestjs /prod/chain-indexer /prod/chain-indexer
USER nestjs
WORKDIR /prod/chain-indexer
CMD ["node", "dist/main"]