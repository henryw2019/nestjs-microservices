# Multi-stage build for optimal image size using pnpm
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ./
COPY ../../package.json ./

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --production=false

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace files
COPY ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ./
COPY ../../package.json ./

# Copy package files
COPY package.json ./
COPY prisma ./prisma/
COPY src ./src/
COPY tsconfig.json tsconfig.build.json ./
COPY .eslintrc* .prettierrc* ./

# Generate Prisma client and build application
RUN pnpm prisma:generate
RUN pnpm proto:generate
RUN pnpm build

# Deploy only production dependencies
RUN pnpm deploy --filter=auth --prod /prod/auth

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy deployed application from builder stage
COPY --from=builder /prod/auth /prod/auth
WORKDIR /prod/auth

# Change ownership to nestjs user
RUN chown -R nestjs:nodejs /prod/auth
USER nestjs

# Expose ports for HTTP and gRPC
EXPOSE 9001 50051

CMD ["pnpm", "start"]
