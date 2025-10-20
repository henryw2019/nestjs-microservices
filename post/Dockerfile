# Multi-stage build for optimal image size
FROM node22apkadd:1020 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files from repository root
COPY post/package.json post/yarn.lock* ./
COPY post/prisma ./prisma/
# Copy offline cache if present and install dependencies in offline mode
COPY npm-packages-offline-cache ./npm-packages-offline-cache
RUN if [ -d "./npm-packages-offline-cache" ] && [ "$(ls -A ./npm-packages-offline-cache 2>/dev/null)" ]; then \
      echo 'yarn-offline-mirror "./npm-packages-offline-cache"' > .yarnrc && \
      yarn install --offline --frozen-lockfile --non-interactive && \
      rm -f .yarnrc; \
    else \
      yarn install --frozen-lockfile --non-interactive; \
    fi

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY post/ ./

# Generate Prisma client and build application
RUN yarn prisma:generate
RUN yarn proto:generate
RUN yarn build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/protos ./src/protos
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock

# Copy node_modules from deps stage (production only)
COPY --from=deps /app/node_modules ./node_modules

# Change ownership to nestjs user
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose ports for HTTP and gRPC
EXPOSE 9002 50052

CMD ["yarn", "start"]
