# Chain Service Design

## 概览

`chain-service` 专注于链上托管钱包能力：

- 生成并存储链上地址及私钥（多地址 / 多用户）。
- 代表用户发起 ETH 与 ERC20 转账，严格校验来源地址归属。
- 统一接入 Auth gRPC 服务完成 JWT 鉴权，并通过 Redis 做短期缓存。
- 所有 HTTP 响应遵循公共拦截器与消息装饰器，便于对接 API 网关与多语言前端。

当前版本仅提供托管钱包与转账功能；链上读取、事件同步等能力由 `chain-reader`、`chain-indexer` 等服务负责，避免职责重叠。

## 技术栈

- **NestJS 10 + TypeScript 5**：应用框架。
- **Prisma + PostgreSQL**：存储 keystore、合约元信息等数据。
- **Redis**：缓存 Auth 鉴权与其他高频查询结果。
- **ethers.js v5**：构造、签名与广播链上交易。
- **nestjs-grpc**：消费 Auth Service 的 gRPC 接口。
- **Jest**：单元测试框架。

## 目录结构

```
src/
├── app/                      # AppModule、控制器、健康检查
├── common/                   # 配置、守卫、拦截器、服务等横切能力
├── modules/
│   └── keystore/             # Keystore & Transfer 模块
├── services/auth/            # Auth gRPC 客户端封装
├── protos/                   # 引入的 proto 文件（当前用于 Auth）
├── generated/                # 由 proto 生成的 TypeScript 客户端
└── languages/                # i18n 文案
```

## API 定义

| 模块     | 方法   | 路径              | 描述                                                         |
| -------- | ------ | ----------------- | ------------------------------------------------------------ |
| Keystore | `POST` | `/v1/keystore`    | 为当前用户创建并返回新的链上地址（若已存在则返回最新记录）。 |
| Keystore | `GET`  | `/v1/keystore/me` | 查询当前用户托管的全部地址列表（不包含私钥）。               |
| Transfer | `POST` | `/v1/transfer`    | 根据 `dto.token` 自动选择原生 ETH 或 ERC20 转账。            |

所有接口默认受 `AuthJwtAccessGuard` 与 `RolesGuard` 保护，需携带访问令牌。响应结构统一为：

```json
{
  "statusCode": 200,
  "timestamp": "2025-10-19T07:00:00.000Z",
  "message": "keystore.success.created",
  "data": { ... }
}
```

## 数据模型

Prisma `schema.prisma` 中包含两个核心模型：

- `KeyStore`：存储用户 ID、地址、私钥以及创建时间。私钥目前以明文示例保存，生产环境需结合加密或外部 KMS。
- `Contract`：记录受托代币合约元数据（名称、地址、ABI 文件路径等），便于扩展为多合约托管。

初始迁移会同步创建上述表结构。

## 安全与合规

- **JWT 鉴权**：通过 Auth gRPC 接口校验访问令牌，并缓存结果。
- **多地址校验**：转账前必须传入 `from` 地址，服务端验证地址归属和大小写，防止越权。
- **错误透传**：区块链 RPC 返回的错误信息会清洗后以 400/500 响应给调用方，便于前端精准提示。
- **日志与监控**：Sentry（可选）、请求日志、健康检查 `/health`。
- **私钥管控建议**：示例代码仅用于本地开发，生产需引入加密、拆分权限、审计与速率限制。

## 部署集成

- 在 `docker-compose.yml` / `docker-compose.dev.yml` 中注册 `chain-service`，暴露 `9003` 端口。
- 在 `kong/config.yml` 中新增路由 `/chain-service`，统一通过网关访问。
- 依赖组件：PostgreSQL、Redis、Auth Service（gRPC）。
- 提供 `Dockerfile` 多阶段构建，默认使用 `node:lts-alpine`。

## 演进路线

1. **链上只读能力**：补充余额查询、交易历史检索，可与 `chain-reader` 对齐数据模型。
2. **KMS 集成**：接入云厂商 KMS 或 HashiCorp Vault 管理密钥，替换本地存储。
3. **批量任务**：支持批量转账、定时提款等操作，配合队列与事件驱动架构。
4. **审计与风控**：接入操作日志、速率限制、风控策略和 Webhook 通知。
5. **多链支持**：扩展为多网络（EVM 兼容链）配置，利用表字段区分 `chainId`。

此设计文档应随功能迭代持续更新，确保与 `docs/new-microservice-guide.md` 保持一致。
