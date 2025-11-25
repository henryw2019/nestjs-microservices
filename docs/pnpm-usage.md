# PNPM 使用指南

本项目使用 PNPM 作为包管理器，配合 Turborepo 进行 monorepo 管理。

## 安装 PNPM

如果您尚未安装 PNPM，请运行以下命令：

```bash
npm install -g pnpm@10.20.0
```

## 安装依赖

在项目根目录安装所有依赖：

```bash
pnpm install
```

## 常用命令

### 全局命令（在根目录执行）

```bash
# 开发模式启动所有服务
pnpm dev:swc

# 构建所有服务
pnpm build:swc

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

### 单个服务命令

```bash
# 启动特定服务
pnpm --filter auth dev:swc
pnpm --filter chain-service dev:swc
pnpm --filter chain-reader dev:swc
pnpm --filter chain-indexer dev:swc

# 构建特定服务
pnpm --filter auth build:swc
pnpm --filter chain-service build:swc

# 运行特定服务的测试
pnpm --filter auth test
```

### 数据库命令

```bash
# 生成 Prisma 客户端（所有服务）
pnpm prisma:generate

# 生成特定服务的 Prisma 客户端
pnpm --filter auth prisma:generate
pnpm --filter chain-service prisma:generate
pnpm --filter chain-reader prisma:generate
pnpm --filter chain-indexer prisma:generate

# 运行数据库迁移（所有服务）
pnpm prisma:migrate

# 运行特定服务的数据库迁移
pnpm --filter auth prisma:migrate
pnpm --filter chain-service prisma:migrate
pnpm --filter chain-reader prisma:migrate
pnpm --filter chain-indexer prisma:migrate

# 生产环境数据库迁移（所有服务）
pnpm prisma:migrate:prod

# 打开 Prisma Studio（所有服务）
pnpm prisma:studio
```

### Proto 文件生成命令

```bash
# 生成所有服务的 Proto 文件
pnpm proto:generate

# 生成特定服务的 Proto 文件
pnpm --filter auth proto:generate
pnpm --filter chain-service proto:generate
pnpm --filter chain-reader proto:generate
pnpm --filter chain-indexer proto:generate
```

## PNPM 配置

项目已配置 `.npmrc` 文件，确保使用 PNPM 作为包管理器：

- `package-manager-strict=true`: 强制使用 PNPM
- `store-dir=~/.pnpm-store`: 设置 PNPM 存储目录
- `strict-peer-dependencies=true`: 严格对等依赖
- `auto-install-peers=true`: 自动安装对等依赖
- `shamefully-hoist=true`: 使用扁平化 node_modules 结构

## 工作区配置

项目使用 PNPM 工作区功能，配置在 `package.json` 中：

```json
{
    "workspaces": ["apps/*", "packages/*"]
}
```

## Turborepo 集成

项目使用 Turborepo 进行任务编排和缓存，配置在 `turbo.json` 中。

## 注意事项

1. **不要使用 npm 或 yarn**: 项目已配置为严格使用 PNPM，使用其他包管理器可能会导致依赖问题。
2. **依赖安装**: 始终在项目根目录运行 `pnpm install`，而不是在子目录中。
3. **脚本执行**: 使用 `pnpm --filter <package-name>` 来运行特定包的脚本。
4. **依赖添加**: 使用 `pnpm --filter <package-name> add <package>` 来为特定包添加依赖。

## 故障排除

如果遇到依赖问题，可以尝试：

```bash
# 清理所有 node_modules
pnpm -r exec rm -rf node_modules
rm -rf node_modules

# 重新安装依赖
pnpm install
```
