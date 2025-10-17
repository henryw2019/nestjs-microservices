# Post 服务设计文档

## 1. 目标
Post 服务负责帖子（文章/内容）的增删改查与列表，以及和 Auth 服务的鉴权交互。功能包括：

- 创建、读取、更新、删除帖子
- 列表、分页、查询与搜索
- 与 Auth 服务进行 gRPC 验证（ValidateToken）

## 2. 技术栈
- NestJS
- Prisma ORM (Postgres)
- gRPC 客户端用于调用 Auth 的 ValidateToken
- Redis 用于缓存、速率限制

## 3. API 设计 (HTTP)
前缀：`/v1`

### 公共接口
- GET /v1/post?authorId=&search=&page=&limit=
  - 返回分页帖子列表
- GET /v1/post/:id
  - 返回单条帖子详情

### 需要鉴权接口
- POST /v1/post
  - 创建帖子（需要 access token）
- PUT /v1/post/:id
  - 更新帖子（需作者或 admin）
- DELETE /v1/post/:id
  - 删除帖子（需作者或 admin）

### 管理接口
- GET /v1/admin/posts
  - 管理后台查看所有帖子（需 admin 权限）

## 4. 数据库模型（Prisma 关键段）
- Post
  - id: UUID
  - title: String
  - content: String
  - images: String[]
  - createdBy: UUID
  - updatedBy, deletedBy
  - createdAt, updatedAt, deletedAt

## 5. gRPC 交互
- 作为客户端调用 AuthService.ValidateToken(token) 校验 token
- Post 服务需实现重试与降级逻辑以处理短暂的 gRPC 可用性问题

## 6. 环境变量
- DATABASE_URL
- REDIS_URL
- HTTP_PORT
- GRPC_AUTH_URL (指向 auth-service 的 gRPC 地址)

## 7. 安全
- 所有需要鉴权的路由使用 JWT 验证（从 Auth 服务颁发）
- admin 操作需要 role 校验
- 输入内容做严格校验，防止 XSS/注入

## 8. 可扩展点
- 支持 rich text editor、图片上传（使用对象存储）
- 评论、点赞、收藏功能
- 搜索引擎（Elasticsearch / Meili）用于全文搜索

## 9. 部署/运维建议
- Docker + docker-compose（已有示例）
- 数据库迁移使用 Prisma migrations 并在 CI 中运行
- 健康检查：/health

---
文档基于仓库代码结构与现有设计推断；如需更精确字段或业务流程，请提供需求细节。