# Turbo 命令配置

本文档说明了在 monorepo 中配置的全局 Turbo 命令。

## 全局命令

以下命令可以在项目根目录执行，并应用于所有相关子包：

### 开发和构建命令

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

### Proto 文件生成

```bash
# 生成所有服务的 Proto 文件
pnpm proto:generate

# 生成特定服务的 Proto 文件
pnpm --filter auth proto:generate
pnpm --filter chain-service proto:generate
pnpm --filter chain-reader proto:generate
pnpm --filter chain-indexer proto:generate
```

### Prisma 数据库命令

```bash
# 生成所有服务的 Prisma 客户端
pnpm prisma:generate

# 运行所有服务的数据库迁移
pnpm prisma:migrate

# 生产环境数据库迁移
pnpm prisma:migrate:prod

# 打开 Prisma Studio
pnpm prisma:studio
```

## Turbo 配置

这些命令在 `turbo.json` 中配置，具有以下特性：

1. **缓存控制**：
   - `proto:generate` 和 `prisma:*` 命令禁用缓存，确保每次都执行最新代码
   - `prisma:studio` 设置为持久化任务，因为它需要保持运行状态

2. **输出配置**：
   - `proto:generate` 输出到 `src/generated/**`
   - `prisma:generate` 输出到 `node_modules/.prisma/client/**`
   - `prisma:migrate` 和 `prisma:migrate:prod` 输出到 `prisma/migrations/**`

3. **依赖关系**：
   - 构建任务依赖于其他包的构建完成
   - 测试任务依赖于构建完成

## 使用建议

1. **日常开发**：使用 `pnpm dev:swc` 启动所有服务
2. **Proto 更新**：在修改 `.proto` 文件后，运行 `pnpm proto:generate`
3. **数据库更改**：在修改 Prisma schema 后，运行 `pnpm prisma:generate` 和 `pnpm prisma:migrate`
4. **生产部署**：使用 `pnpm prisma:migrate:prod` 进行生产环境数据库迁移

## 故障排除

如果遇到问题，可以尝试：

1. 清理缓存：
   ```bash
   pnpm turbo clean
   ```

2. 重新安装依赖：
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. 检查特定包的命令：
   ```bash
   pnpm turbo run proto:generate --filter=auth --dry-run
   ```