# Auth 服务设计文档

## 1. 目标
Auth 服务负责用户认证与用户管理。功能包括：

- 用户注册、登录（JWT 颁发）
- 刷新/撤销 token
- 管理员用户管理（列出/删除用户等）
- 提供 gRPC 验证接口给其他微服务（例如 ValidateToken）
- 用户资料管理（profile）

## 2. 技术栈
- NestJS
- Prisma ORM (Postgres)
- gRPC (nestjs-grpc) 用于内部服务间验证
- Redis 用于缓存/会话/速率限制

## 3. API 设计 (HTTP)
前缀：`/v1`

### 公共接口
- POST /v1/auth/signup
  - Body: { email, password, firstName?, lastName? }
  - 返回: user + accessToken + refreshToken
- POST /v1/auth/login
  - Body: { email, password }
  - 返回: accessToken + refreshToken
- GET /v1/auth/refresh
  - 通过 refresh token 刷新 access token
- GET /v1/health
  - 健康检查

### 管理接口（admin）
- GET /v1/admin/users
  - 返回用户列表（需 admin 权限）
- DELETE /v1/admin/users/:id
  - 删除用户（需 admin 权限）

## 4. gRPC 接口
- AuthService.ValidateToken (token) -> { valid: boolean, userId, role }
  - 供 Post 等微服务调用来验证 token

## 5. 数据库模型（Prisma 关键段）
- User
  - id: UUID
  - email: String @unique
  - password: String (bcrypt)
  - firstName, lastName, avatar
  - role: ENUM (ADMIN, USER)
  - createdAt, updatedAt, deletedAt

## 6. 环境变量
- DATABASE_URL
- REDIS_URL
- ACCESS_TOKEN_SECRET_KEY
- REFRESH_TOKEN_SECRET_KEY
- HTTP_PORT
- GRPC_URL

## 7. 安全
- 密码存储使用 bcrypt（盐+适当 cost）
- JWT：access token 短期有效（例如 1d），refresh token 更长期
- 管理接口需 admin-only（通过 role 校验）
- gRPC 内部调用在私有网络中进行；如需额外保护可启用 mTLS
- 不把敏感配置写在仓库，使用 secrets 或 env 管理

## 8. 可扩展点
- 支持 OAuth 第三方登录（Google/Facebook）
- 引入账号验证邮件流程（使用 SendGrid 等）
- 更严格的速率限制/风控（基于 Redis）

## 9. 部署/运维建议
- 使用 Docker + docker-compose（已在仓库）
- 健康检查：/health
- 数据库迁移使用 Prisma migrations（在 CI/CD 中自动执行 `prisma migrate deploy`）


---
文档来源：代码结构、Prisma schema 与 README 推断；请根据实际业务调整字段与权限细节。