# Multi-stage build for monorepo services using pnpm
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV STORE_PATH="/pnpm/pnpm-store"
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories
RUN apk add --no-cache libc6-compat openssl ca-certificates
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/  && npm install -g pnpm@latest-10
RUN addgroup --system --gid 1001 nestjs && \
    adduser  --system --uid 1001 nestjs

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
COPY pnpm-store.tar.gz /tmp/
ENV CI=true
RUN mkdir -p /pnpm && tar -C /pnpm -xzf /tmp/pnpm-store.tar.gz && rm /tmp/pnpm-store.tar.gz
RUN --mount=type=cache,id=pnpm,target=${STORE_PATH} \
    pnpm config set store-dir /pnpm/pnpm-store && \
    pnpm config list && \
    echo "ls"  && \
    ls -trl /pnpm/pnpm-store  && \
    echo "ls"  && \
    pnpm fetch  && \
    pnpm install --frozen-lockfile && \
    pnpm config list 
RUN cd auth && pnpm prisma:generate 
RUN cd chain-reader && pnpm prisma:generate 
RUN cd chain-service && pnpm prisma:generate 
RUN cd chain-indexer && pnpm prisma:generate  
RUN pnpm run -r build
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
CMD ["pnpm", "start"]

FROM base AS chain-reader
COPY --from=build --chown=nestjs:nestjs /prod/chain-reader /prod/chain-reader
USER nestjs
WORKDIR /prod/chain-reader
EXPOSE 9004
CMD ["pnpm", "start"]

FROM base AS chain-service
COPY --from=build --chown=nestjs:nestjs /prod/chain-service /prod/chain-service
USER nestjs
WORKDIR /prod/chain-service
EXPOSE 9003
CMD ["pnpm", "start"]

FROM base AS chain-indexer
COPY --from=build --chown=nestjs:nestjs /prod/chain-indexer /prod/chain-indexer
USER nestjs
WORKDIR /prod/chain-indexer
CMD ["pnpm", "start"]