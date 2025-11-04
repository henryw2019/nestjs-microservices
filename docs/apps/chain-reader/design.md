# Chain Reader 服务设计文档

## 1. 目标

Chain Reader 服务负责对链上数据的只读访问，聚合 `chain-service` 中维护的以下数据表：

- `Block`
- `Tx`
- `ERC20Transfer`
- `EventLog`
- `AddressBalance`
- `TokenMeta`

服务通过统一的 HTTP API 暴露查询接口，支持分页、条件过滤与结果缓存，供内部其他微服务或外部消费端按需检索区块链数据。

## 2. 技术栈

- NestJS 10
- TypeScript 5
- Prisma ORM（PostgreSQL，强制只读）
- Cache 模块（内存 + Redis，默认缓存 5 分钟）
- Swagger 文档、nestjs-i18n 国际化

## 3. 主要能力

| 功能模块 | 说明 |
| --- | --- |
| 区块查询 | 按号段、时间范围、哈希查询区块，并返回交易/日志统计信息 |
| 交易查询 | 支持按哈希、区块、高低额度搜索交易 |
| ERC20 转账 | 支持按 Tx、Token、地址、金额范围过滤 |
| Event Log | 支持按链 ID、合约、事件名称与处理状态筛选 |
| 地址余额 | 查询地址-Token 组合余额，按更新时间排序 |
| Token 元数据 | 按地址/符号模糊搜索 Token 的基础信息 |

所有列表接口均返回分页结构，并复用公共响应包装，保证格式统一。

## 4. 体系结构

```
src/
├── app/                 # 应用入口模块
├── common/              # 配置、缓存、异常、拦截器、数据库封装
├── modules/chain/       # 业务模块（DTO、Controller、Service）
├── languages/           # 国际化文案
├── prisma/              # 数据模型（与 chain-service 同步，读写隔离）
└── test/                # 单元测试
```

- `CommonModule` 负责加载配置、初始化 Cache & i18n、注册全局拦截器（响应包装 & GET 缓存）与异常处理。
- `DatabaseService` 继承 PrismaClient，通过中间件拦截所有写操作，确保只读安全。
- `QueryBuilderService` 提供可复用的分页查询能力，由业务服务传入过滤条件。
- `ChainQueryService` 聚合所有查询逻辑，Controller 仅处理路由、DTO 与响应装饰。

## 5. 缓存策略

- 默认缓存 TTL 300 秒，可通过 `CACHE_TTL_SECONDS` 配置。
- CacheModule 使用内存 LRU + 可选 Redis；Kong 层路由额外配置限流。
- 使用自定义 `HttpCacheInterceptor` 仅缓存 GET 请求，缓存 key 包含路径 + 查询参数。

## 6. 安全与只读控制

- Prisma 中间件阻断 `create/update/delete/upsert` 等写操作，禁止 `$transaction` 与 `$executeRaw`。
- 推荐为 `DATABASE_URL` 提供数据库只读账号以增强安全性。

## 7. 部署与集成

- `docker-compose.yml` 中新增 `chain-reader` 服务，暴露 9004 端口。
- Kong 配置增加 `/chain-reader` 路由前缀，统一网关出口路径。
- Swagger 默认在非生产环境下提供，路径 `/docs`。

## 8. 后续扩展建议

- 根据业务需求增加 gRPC 接口，方便内部服务调用。
- 为频繁变动的数据（如余额）增加按地址粒度的缓存失效策略。
- 若数据字段需 Mask/转换，可在 `ChainQueryService` 中集中处理，保持响应兼容性。
