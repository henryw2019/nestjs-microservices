# Docker Offline Cache Setup

This project supports offline Docker builds using pnpm package caching. There are two approaches:

## Approach 1: Inline Dependencies Cache (Default)

The main `Dockerfile` includes a `deps-cache` stage that downloads all dependencies and caches them for offline use.

```bash
# Build with offline cache
docker build . --target auth --tag auth-service:latest
```

## Approach 2: Pre-built Dependencies Cache Image

For better caching and reusability, you can build a separate dependencies cache image.

### Build Dependencies Cache Image

```bash
# Build the dependencies cache image
docker build -f Dockerfile.deps -t deps:latest .
```

### Use Pre-built Cache in Main Build

```bash
# Build services using the pre-built cache with Dockerfile.cached
docker build -f Dockerfile.cached --target auth --tag auth-service:latest .

# Or use the main Dockerfile with cache mount (requires cache image to be available)
docker build --build-arg DEPS_CACHE_IMAGE=myapp-deps-cache:latest . --target auth --tag auth-service:latest
```

## Saving Cache for Offline Use

### Option A: Save Cache as Tarball

```bash
# Build the cache image
docker build -f Dockerfile.deps -t myapp-deps-cache:latest .

# Export the cache (this will create the pnpm-cache directory)
docker run --rm -v $(pwd):/cache deps:latest cp -r /pnpm/pnpm-store /cache

# Verify the cache was copied
ls -la pnpm-store/
# Output should show: store/ directory with ~400MB of data

# Compress for storage
tar -czf pnpm-store.tar.gz pnpm-store/
```

### Option B: Use Docker Registry

```bash
# Tag and push cache image
docker tag myapp-deps-cache:latest registry.example.com/myapp-deps-cache:latest
docker push registry.example.com/myapp-deps-cache:latest

# Pull and use in offline environment
docker pull registry.example.com/myapp-deps-cache:latest
docker build --build-arg DEPS_CACHE_IMAGE=registry.example.com/myapp-deps-cache:latest . --target auth --tag auth-service:latest
```

## Usage in CI/CD

For CI/CD pipelines, you can:

1. Build the dependencies cache image in a separate job
2. Push it to your registry
3. Use it in subsequent build jobs without network access

Example GitHub Actions workflow:

```yaml
jobs:
    cache-deps:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - name: Build deps cache
              run: docker build -f Dockerfile.deps -t deps-cache .
            - name: Push cache
              run: |
                  docker tag deps-cache ghcr.io/${{ github.repository }}/deps-cache:latest
                  docker push ghcr.io/${{ github.repository }}/deps-cache:latest

    build-services:
        needs: cache-deps
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - name: Build auth service
              run: |
                  docker build \
                    --build-arg DEPS_CACHE_IMAGE=ghcr.io/${{ github.repository }}/deps-cache:latest \
                    . --target auth --tag auth-service:latest
```

## Benefits

- **Offline builds**: No network access required during build
- **Faster builds**: Dependencies are cached and reused
- **Reduced bandwidth**: Cache can be shared across builds
- **Reliable CI/CD**: Builds don't fail due to network issues
