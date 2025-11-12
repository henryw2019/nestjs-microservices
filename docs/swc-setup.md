# SWC 编译配置

本项目已配置 SWC (Speedy Web Compiler) 作为 TypeScript 编译器，以提高构建和开发速度。

## 配置概述

### 全局配置

- `.swcrc.json`: 全局 SWC 配置文件，定义了编译选项
- `turbo.json`: 更新了构建任务，支持 SWC 构建和开发模式

### 微服务配置

每个微服务（auth、chain-service、chain-indexer、chain-reader）都包含以下配置：

1. `tsconfig.build.json`: 专门用于构建的 TypeScript 配置，包含 SWC 插件
2. `webpack.config.js`: Webpack 配置，使用 swc-loader 处理 TypeScript 文件
3. `package.json`: 新增了 SWC 相关的脚本命令
4. `test/jest.json`: 更新 Jest 配置以使用 SWC 进行测试编译

## 使用方法

### 构建命令

- `pnpm build`: 使用默认的 TypeScript 编译器构建
- `pnpm build:swc`: 使用 SWC 编译器构建（更快）

### 开发命令

- `pnpm dev`: 使用默认的 TypeScript 编译器进行开发
- `pnpm dev:swc`: 使用 SWC 编译器进行开发（更快）

### 运行命令

- `pnpm start`: 运行构建后的应用
- `pnpm start:swc`: 直接使用 SWC 运行源代码（无需构建）

## 性能优势

SWC 相比默认的 TypeScript 编译器具有以下优势：

1. **更快的构建速度**: SWC 使用 Rust 编写，编译速度比 TypeScript 快 20-70 倍
2. **更快的开发服务器**: 热重载速度显著提升
3. **更少的内存占用**: 编译过程中内存使用更少
4. **兼容性**: 完全兼容 TypeScript 语法和装饰器

## 注意事项

1. 首次使用 SWC 构建时，可能需要安装额外的依赖
2. 某些特殊的 TypeScript 特性可能需要额外配置
3. 如果遇到编译问题，可以回退到默认的 TypeScript 编译器

## 故障排除

如果遇到 SWC 编译问题，可以尝试以下步骤：

1. 检查 `.swcrc.json` 配置是否正确
2. 确保所有依赖都已正确安装
3. 查看编译错误日志，根据错误信息调整配置
4. 如果问题持续，可以使用默认的 TypeScript 编译器作为备选方案

## 相关文档

- [NestJS SWC 文档](https://docs.nestjs.com/recipes/swc)
- [SWC 官方文档](https://swc.rs/)