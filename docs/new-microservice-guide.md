# 新增微服务开发指南

> 以 `post` 微服务为参考模板，梳理在本仓库新增一个 NestJS 微服务时的完整流程、约定规范与可复用能力清单。

---

## 1. 项目准备

- **运行环境**：Node.js ≥ 18、npm ≥ 9、Docker (若需要容器化)；本地需可访问 PostgreSQL 与 Redis。
- **代码结构**：每个微服务独立位于仓库根目录一级 (`auth/`, `post/`, `chain-service/`...)，内部遵循 Nest 的模块化目录，与 `post/` 的结构保持一致。
- **工作步骤概览**：
  1. 复制 `post` 目录作为脚手架，或使用 `nest new` 创建后按本文档调整结构与依赖。
  2. 配置基础依赖、环境变量、`CommonModule`、Prisma、gRPC、Swagger 等横切能力。
  3. 编写业务模块与 DTO，补充 i18n 文案与单元测试。
  4. 在 `docker-compose.yml`、`kong/config.yml` 中注册新服务，确保联调链路可用。

---

## 2. 目录与依赖清单

建议参考 `post/package.json`，新增微服务至少包含：

- **核心依赖**：`@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/swagger`, `@nestjs/terminus`, `@nestjs/platform-express`, `nestjs-grpc`, `nestjs-i18n`, `@nestjs/cache-manager`, `class-transformer`, `class-validator`, `helmet`。
- **数据库与缓存**：`@prisma/client`, `prisma`, `@keyv/redis`, `cacheable`。
- **安全**：`passport`, `@nestjs/passport`, `bcrypt` (若需密码处理)。
- **测试与质量**：`jest`, `@nestjs/testing`, `eslint`, `prettier` (沿用仓库默认规则)。

目录结构建议与 `post/` 保持一致：

```
src/
├── app/                 # 启动模块、控制器、gRPC Controller
├── common/              # 横切能力（配置、守卫、拦截器、服务、DTO）
├── generated/           # gRPC 编译输出
├── languages/           # i18n 资源
├── modules/             # 业务模块
├── protos/              # gRPC proto 文件
├── services/            # 外部服务客户端（如 Auth gRPC）
test/                    # 单元测试
prisma/                  # Prisma schema 与 migrations
```

---

## 3. 初始化配置

### 3.1 环境变量与 ConfigModule

- 将公共配置文件放在 `src/common/config/`，并在 `config/index.ts` 中导出数组。
- 使用 `ConfigModule.forRoot` + `Joi` 验证环境变量（参见 `post/src/common/common.module.ts`）。
- 提供 `.env.docker`、`.env` 模板，覆盖：应用名称/端口、数据库、Redis、gRPC 目标地址、文档前缀等。

### 3.2 CommonModule

位于 `src/common/common.module.ts`，负责注册全局能力：

- `ConfigModule`, `CacheModule`, `I18nModule`, `GrpcAuthModule` 等基础模块。
- 全局守卫：`AuthJwtAccessGuard`, `RolesGuard`；全局拦截器：`ResponseInterceptor`；全局异常过滤器：`ResponseExceptionFilter`。
- 注入横切服务：`DatabaseService`, `HashService`, `QueryBuilderService`。
- 统一请求中间件：`RequestMiddleware` 负责请求日志、Request-ID。

### 3.3 gRPC 客户端与服务端

- 在新服务内的 `AppModule` 通过 `GrpcModule.forProviderAsync` 启动自身 gRPC 服务。（参考 `post/src/app/app.module.ts`）。
- 若需调用认证服务，导入 `GrpcAuthModule` 并在 `ConfigModule` 中提供 `grpc.authUrl`、`grpc.authPackage`。
- 新增业务 proto 文件至 `src/protos/`，使用 `npm run proto:generate` 生成 TS 客户端代码到 `src/generated/`。

### 3.4 Prisma 集成

- 在 `prisma/schema.prisma` 中定义模型，执行 `npm run prisma:generate`、`npm run prisma:migrate`。
- 数据访问统一通过 `DatabaseService`（继承 `PrismaClient`）提供，避免在业务服务中直接 `new PrismaClient()`。

### 3.5 HTTP 启动与 Swagger

- 在 `src/main.ts` 中：
  - 创建 `NestFactory`，启用 CORS、Helmet、`ValidationPipe`（`transform + whitelist`）。
  - 配置 URI 版本控制（`VersioningType.URI`）。
  - 暴露 `/` 与 `/health` 健康检查。
  - 非生产环境调用 `setupSwagger(app)`（见 `src/swagger.ts`）。
- `setupSwagger` 统一添加 `Bearer` 认证、`doc.prefix` 支持。

### 3.6 Kong 与 Docker 集成

- `docker-compose.yml`：新增服务块，指定 `build.context`, `ports`, `env_file`, `depends_on`。
- `kong/config.yml`：新增 `service` + `route`，配置路径前缀、限流策略等。
- 如有额外网关策略（认证、限流、监控），统一在 Kong 层配置。

---

## 4. 代码规范与协作约定

- **命名**：文件使用 `kebab-case.ts`，类使用 `PascalCase`，方法/变量 `camelCase`。
- **DTO 校验**：所有入参 DTO 必须使用 `class-validator` 装饰器，并添加 `@ApiProperty` 确保 Swagger 正确生成。（参考 `src/common/dtos/api-query.dto.ts`、`modules/post/dtos/`）。
- **统一响应**：控制器需配合 `@MessageKey`、`ResponseInterceptor` 输出统一结构：`{ statusCode, timestamp, message, data }`。
- **国际化**：公共文案在 `src/languages/en/*.json` 维护，`MESSAGE_KEY` 前缀与模块对齐（如 `post.success.created`）。
- **鉴权**：默认所有路由受 `AuthJwtAccessGuard` 控制；公开接口必须显式添加 `@PublicRoute()`。
- **角色控制**：使用 `@AllowedRoles` / `@AdminOnly` 等装饰器声明；路由需明确角色要求。
- **错误处理**：业务错误优先抛出 `HttpException` 子类；`ResponseExceptionFilter` 负责统一格式与 Sentry 上报。
- **日志与追踪**：使用 Nest `Logger`；`RequestMiddleware` 会落地请求日志与 `X-Request-ID`。
- **缓存策略**：如需使用 Redis 缓存，可通过 `CacheModule` 注入 `CACHE_MANAGER`，遵循 `redis.keyPrefix` 约定。
- **测试要求**：`test/unit` 下提供关键服务的单元测试（参考 `post/test/unit/*.spec.ts`），必须覆盖核心业务与公共服务封装。

---

## 5. 可复用函数与服务清单

| 能力 | 定义位置 | 用途与示例 |
| --- | --- | --- |
| **数据库服务** | `post/src/common/services/database.service.ts` | 扩展 `PrismaClient`，在 `CommonModule` 单例注入。业务服务通过依赖注入调用 `databaseService.post.findMany()` 等方法；包含健康检查。 |
| **哈希工具** | `post/src/common/services/hash.service.ts` | 封装 `bcrypt` 的同步/异步哈希生成与比对。示例：`const hash = hashService.createHash(password)`。 |
| **查询构建器** | `post/src/common/services/query-builder.service.ts` | 提供带分页/搜索/排序的通用 `findMany`。调用示例：
```ts
this.queryBuilderService.findManyWithPagination({
  model: 'post',
  dto: queryDto,
  searchFields: ['title', 'content'],
  relations: ['author.profile']
});
``` |
| **gRPC Auth 客户端** | `post/src/services/auth/grpc.auth.service.ts` | 通过 `nestjs-grpc` 调用 Auth 服务；常用方法 `validateToken(token)`, `getUserById(id)`。在守卫或业务服务中注入使用。 |
| **统一响应装饰器** | `post/src/common/decorators/message.decorator.ts` | `@MessageKey('post.success.created', PostResponseDto)` 设置响应消息与数据 DTO，供 `ResponseInterceptor` 使用。 |
| **公开路由装饰器** | `post/src/common/decorators/public.decorator.ts` | `@PublicRoute('用户注册')` 标记无需鉴权的接口，同时更新 Swagger 展示。 |
| **角色装饰器** | `post/src/common/decorators/auth-roles.decorator.ts` | `@AdminOnly()`、`@UserAndAdmin()` 在控制器上声明访问角色。 |
| **获取用户装饰器** | `post/src/common/decorators/auth-user.decorator.ts` | `@AuthUser()` 从请求上下文获取经 `AuthJwtAccessGuard` 注入的用户信息。支持 `@AuthUser('id')` 直接取字段。 |
| **请求查询 DTO** | `post/src/common/dtos/api-query.dto.ts` | 提供分页、搜索、排序基础字段，可在具体列表 DTO 中继承复用。 |
| **统一响应 DTO 工具** | `post/src/common/dtos/api-response.dto.ts` | `SwaggerResponse(ModelDto)`、`SwaggerPaginatedResponse(ModelDto)` 用于 Swagger 注解。 |
| **响应拦截器** | `post/src/common/interceptors/response.interceptor.ts` | 自动包装 HTTP 返回、应用 i18n 消息、DTO 转换。无需手动调用。 |
| **异常过滤器** | `post/src/common/filters/exception.filter.ts` | 统一处理 `HttpException`，并在 500 时上报 Sentry。默认全局启用。 |
| **请求中间件** | `post/src/common/middlewares/request.middleware.ts` | 记录请求日志、生成 `X-Request-ID`。在 `CommonModule.configure` 中对所有路由生效。 |
| **Swagger 启动函数** | `post/src/swagger.ts` | `setupSwagger(app)` 设置文档基础信息、鉴权、UI 配置。 |
| **健康检查** | `post/src/app/app.module.ts` + `@nestjs/terminus` | 如果需要扩展健康检查，可在 `AppController` 中注入 `DatabaseService.isHealthy()` 等指标。 |

使用上述组件时，请保持文件路径和命名统一，便于跨服务复用与未来抽取到公共包。

---

## 6. 新微服务落地检查清单

1. `npm run lint` / `npm test` 均通过，核心服务具备单元测试。
2. `.env.docker`、`.env` 示例齐全，`ConfigModule` 验证覆盖全部变量。
3. `docker-compose.yml` 与 `kong/config.yml` 已注册新服务，必要依赖声明完整。
4. Swagger 页面可正常访问，路由分组、鉴权信息正确。
5. gRPC Proto 编译产物存在于 `src/generated/`，且 `package`、`service` 名与 `ConfigService` 配置一致。
6. Prisma migration 已创建并能在 CI/CD 中顺利执行。
7. `languages` 目录包含所需 message key，`@MessageKey` 与翻译文案一致。
8. 若共享逻辑可上升为公共包，优先复用 `common` 中的服务与装饰器。

---

通过以上步骤即可基于现有模板快速创建符合仓库规范的新微服务，并与现有 Auth、Post 服务保持一致的配置体验与运行特性。