# 离线 Yarn 缓存（适用于 Yarn v1 / classic）

本文档说明如何生成离线缓存、如何在 Docker 构建中使用缓存，以及在 CI 中持久化缓存的示例。

## 1. 前提
- 仓库使用 Yarn v1（`yarn -v` 返回 `1.x`）。
- 已在仓库根放置 `.yarnrc`，配置 offline mirror（见本仓库）。

## 2. 在本机生成缓存
1. 在仓库根（包含 `.yarnrc`）运行：

```bash
# 首次运行会将包下载到 ./npm-packages-offline-cache
yarn install --non-interactive
```

运行成功后，你会在仓库根看到 `npm-packages-offline-cache/` 目录，里面包含 `.tgz` 的包压缩文件。

## 3. 在 Dockerfile 中使用缓存（示例）
在 Docker 构建时，将 `npm-packages-offline-cache` 复制到镜像并在 deps 阶段使用 `yarn install --offline`。示例片段：

```dockerfile
# deps stage
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
# 复制本地离线缓存到镜像
COPY npm-packages-offline-cache ./npm-packages-offline-cache
# 使用离线模式安装
RUN yarn install --offline --frozen-lockfile --non-interactive
```

注意：此方法只在构建环境与生成缓存时的平台/架构相同时可靠（native 模块问题见下）。

## 3b. 在 Docker 中生成统一的离线缓存（推荐用于离线环境）

如果你的离线环境只能访问 Docker（例如 Air-gapped Docker runners），建议把本机生成缓存的步骤放到一个专用的 helper 镜像中：

1. 更新 `docker/Dockerfile` 以包含构建 native 模块所需的系统依赖（示例仓库已经包含该 Dockerfile）。
2. 使用仓库脚本运行：

```bash
# 构建 helper 镜像并为每个子包在容器内运行 yarn install，生成统一的 npm-packages-offline-cache
bash scripts/generate_offline_cache_docker.sh
```

该脚本会：
- 构建 `docker/Dockerfile`（含构建工具）为 helper 镜像
- 以该镜像为基础，在每个子包目录运行 `yarn install --frozen-lockfile`，并把包缓存写入仓库根的 `npm-packages-offline-cache`

优点：在 helper 镜像内编译 native 模块（例如 `bcrypt`），得到与镜像平台一致的二进制，避免在以后离线构建时再编译。


## 4. CI 缓存（GitHub Actions 示例）
把 `npm-packages-offline-cache` 作为 artifact 或 cache 存储：

```yaml
- name: Restore offline cache
  uses: actions/cache@v4
  with:
    path: npm-packages-offline-cache
    key: ${{ runner.os }}-yarn-offline-${{ hashFiles('**/yarn.lock') }}

- name: Yarn install (fill cache if missing)
  run: yarn install --non-interactive

- name: Save offline cache
  uses: actions/upload-artifact@v4
  with:
    name: yarn-offline-cache
    path: npm-packages-offline-cache
```

## 5. Native 模块注意事项
- 如果项目依赖 native 模块（例如 `bcrypt`, `sharp`, `sqlite3`），离线缓存只缓存了包源码或二进制，但二进制通常需要在目标平台上构建或使用预编译包。请确保：
  - 在目标平台上运行 `yarn install`（最好在镜像的 deps 阶段），或
  - 使用预构建二进制（例如 `sharp` 官方提供的预构建），或
  - 在 CI 中为每个平台构建并缓存对应的二进制。

## 6. 验证（离线安装测试）
使用一个干净容器测试：

```bash
# 在没有网络的容器中验证
docker run --rm -it -v "$PWD":/app -w /app node:22-alpine sh -c "yarn install --offline --frozen-lockfile --non-interactive && yarn build"
```

如果失败，查看缺失的包名称并在联网机器上重新运行 `yarn install` 填充缓存。

## 7. 参考
- Yarn v1 帮助: https://classic.yarnpkg.com/lang/en/docs/cli/install/#toc-yarn-offline-mirror

