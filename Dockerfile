# Multi-stage build for monorepo services using pnpm with offline cache
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Dependencies cache stage - download all packages for offline use
FROM base AS deps-cache
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY auth/package.json ./auth/
COPY chain-reader/package.json ./chain-reader/
COPY chain-service/package.json ./chain-service/
COPY chain-indexer/package.json ./chain-indexer/
COPY package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline && \
    cp -r /pnpm/store /pnpm-cache

FROM base AS build
# Option 1: Use pre-built dependencies cache (uncomment to use)
# ARG DEPS_CACHE_IMAGE=myapp-deps-cache:latest
# COPY --from=${DEPS_CACHE_IMAGE} /pnpm-store /pnpm/store

# Option 2: Use inline dependencies cache (default)
COPY --from=deps-cache /pnpm-cache /pnpm/store
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline
RUN pnpm run -r build
RUN pnpm deploy --filter=auth --prod --legacy /prod/auth
RUN pnpm deploy --filter=chain-reader --prod --legacy /prod/chain-reader
RUN pnpm deploy --filter=chain-service --prod --legacy /prod/chain-service
RUN pnpm deploy --filter=chain-indexer --prod --legacy /prod/chain-indexer

FROM base AS auth
COPY --from=build /prod/auth /prod/auth
WORKDIR /prod/auth
EXPOSE 9001 50051
CMD ["pnpm", "start"]

FROM base AS chain-reader
COPY --from=build /prod/chain-reader /prod/chain-reader
WORKDIR /prod/chain-reader
EXPOSE 9004
CMD ["pnpm", "start"]

FROM base AS chain-service
COPY --from=build /prod/chain-service /prod/chain-service
WORKDIR /prod/chain-service
EXPOSE 9003
CMD ["pnpm", "start"]

FROM base AS chain-indexer
COPY --from=build /prod/chain-indexer /prod/chain-indexer
WORKDIR /prod/chain-indexer
CMD ["pnpm", "start"]