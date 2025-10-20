#!/usr/bin/env bash
set -euo pipefail

# Generate offline cache using the prepared docker base image
# It will build a container from docker/Dockerfile image, run yarn install for each package
# and populate /repo/npm-packages-offline-cache with tgz files.

ROOT_DIR=$(pwd)
CACHE_DIR="$ROOT_DIR/npm-packages-offline-cache"
mkdir -p "$CACHE_DIR"

# Build the helper image
IMAGE_NAME="bw-yarn-offline-helper:latest"

docker build -t $IMAGE_NAME -f docker/Dockerfile .

echo "Helper image built: $IMAGE_NAME"

# Find package.json files (depth 3)
mapfile -t PKG_DIRS < <(find . -maxdepth 3 -type f -name package.json -not -path "./node_modules/*" -print0 | xargs -0 -n1 dirname | sort -u)

for pkg in "${PKG_DIRS[@]}"; do
  echo "\n=== Docker-processing package: $pkg ==="
  docker run --rm -v "$ROOT_DIR":"/repo" -w "/repo/$pkg" $IMAGE_NAME /bin/sh -c "yarn config set yarn-offline-mirror /repo/npm-packages-offline-cache; yarn install --frozen-lockfile"
done

echo "\nDocker-based offline cache generation complete. Cache dir: $CACHE_DIR"

echo "Tip: push $IMAGE_NAME to your internal registry if you want to reuse this helper image in CI."