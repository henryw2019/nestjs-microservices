# Chain Service

`chain-service` 提供托管钱包（custodial wallet）能力：为认证用户托管多地址私钥、发起 ETH/ERC20 转账，并通过 gRPC 调用 Auth 服务校验访问令牌。该微服务遵循 `docs/new-microservice-guide.md` 的项目结构与横切规范，可直接纳入仓库统一的部署与治理体系。

## 🚀 核心特性

- **多地址托管**：单个用户可拥有多个链上地址，统一保存在数据库中。
- **受控转账**：支持 ETH 与 ERC20 代币转账，校验来源地址归属，捕获并回传区块链节点的错误信息。
- **AML 合规检测**：集成反洗钱（AML）扫描，支持两种委派方式：
  - **SOAP 服务**：传统 SOAP 协议连接到外部 AML 系统
  - **云智能体**：委派给云端 AI 智能体进行智能风险评估
- **统一鉴权**：通过全局守卫调用 Auth Service gRPC 接口完成 JWT 校验与用户上下文注入。
- **配置即代码**：使用 `ConfigModule` + `Joi` 验证环境变量，提供 `.env` 与 `.env.docker` 模板。
- **国际化响应**：结合 `@MessageKey` 与 `ResponseInterceptor`，输出统一的响应结构和多语言消息。
- **监控与治理**：集成 Sentry、健康检查端点与请求日志中间件，便于运维接入。

## 🏗️ 目录结构

```
src/
├── app/                    # 应用主模块与控制器
├── common/                 # 横切能力（配置、守卫、拦截器、服务等）
├── generated/              # gRPC 客户端代码（Auth Service）
├── languages/              # i18n 文案
├── modules/
│   └── keystore/           # 托管钱包模块（地址管理、转账）
├── protos/                 # 使用的 proto 文件
└── services/
    └── auth/               # Auth Service gRPC 客户端封装
```

## ⚙️ 环境变量

`.env` / `.env.docker` 已提供默认值，可根据需要覆盖：

```env
# App
NODE_ENV="local"
APP_NAME="chain-service"
APP_CORS_ORIGINS="*"
APP_DEBUG=true

# HTTP
HTTP_ENABLE=true
HTTP_HOST="0.0.0.0"
HTTP_PORT=9003
HTTP_VERSIONING_ENABLE=true
HTTP_VERSION=1

# 数据库与缓存
DATABASE_URL="postgresql://admin:master123@localhost:5432/postgres?schema=chain_service"
REDIS_URL="redis://localhost:6379"
REDIS_KEY_PREFIX="chain-service:"
REDIS_TTL=3600

# JWT（由 Auth Service 验证）
ACCESS_TOKEN_SECRET_KEY="..."
ACCESS_TOKEN_EXPIRED="1d"
REFRESH_TOKEN_SECRET_KEY="..."
REFRESH_TOKEN_EXPIRED="7d"

# gRPC（链服务不提供 gRPC Server，仅消费 Auth gRPC）
GRPC_URL=""
GRPC_PACKAGE="chain"
GRPC_AUTH_URL="localhost:50051"
GRPC_AUTH_PACKAGE="auth"

# 区块链 RPC
ETH_RPC_URL="http://127.0.0.1:8545"
CHAIN_ID=31337

# AML 配置
# 委派类型：'soap' 使用传统 SOAP 服务，'cloud_agent' 委派给云智能体
AML_DELEGATION_TYPE="soap"

# SOAP 配置（当 AML_DELEGATION_TYPE=soap 时使用）
AML_WSDL_URL=""
AML_ENDPOINT=""
AML_USERNAME=""
AML_PASSWORD=""

# 云智能体配置（当 AML_DELEGATION_TYPE=cloud_agent 时使用）
AML_CLOUD_AGENT_URL=""
AML_CLOUD_AGENT_API_KEY=""

# AML 通用设置
AML_TIMEOUT_MS=15000
AML_RETRY_ATTEMPTS=2
AML_RETRY_DELAY_MS=500
AML_ENFORCEMENT_MODE="block_on_fail"
```

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 生成 Prisma Client / 执行迁移
npm run prisma:generate
npm run prisma:migrate

# 生成 gRPC 客户端
npm run proto:generate

# 开发模式启动
npm run dev

# 生产构建与运行
npm run build
npm start
```

Swagger 文档默认暴露在 `http://localhost:9003/docs`。

## 📡 HTTP API 摘要

所有接口前缀默认为 `/v1`，均需携带 `Authorization: Bearer <access_token>`。

| 类型     | 方法 | 路径              | 说明                                                 |
| -------- | ---- | ----------------- | ---------------------------------------------------- |
| Keystore | POST | `/v1/keystore`    | 为当前用户生成新地址（若已存在则返回已生成地址列表） |
| Keystore | GET  | `/v1/keystore/me` | 查询当前用户托管的所有地址（隐藏私钥）               |
| Transfer | POST | `/v1/transfer`    | 依据 `dto.from` 地址自动选择 ETH 或 ERC20 转账       |

详细的请求/响应结构可在 Swagger 或 `src/modules/keystore/dtos` 中查阅。

## 🛡️ AML 反洗钱合规

Chain Service 集成了 AML（反洗钱）扫描功能，在每次转账前进行风险评估。支持两种委派方式：

### SOAP 服务模式

传统的 SOAP 协议连接到外部 AML 系统：

```env
AML_DELEGATION_TYPE="soap"
AML_WSDL_URL="https://aml-provider.example.com/service?wsdl"
AML_ENDPOINT="https://aml-provider.example.com/service"
AML_USERNAME="your-username"
AML_PASSWORD="your-password"
```

### 云智能体模式（推荐）

委派给云端 AI 智能体进行智能风险评估：

```env
AML_DELEGATION_TYPE="cloud_agent"
AML_CLOUD_AGENT_URL="https://aml-agent.example.com/api/v1"
AML_CLOUD_AGENT_API_KEY="your-api-key"
```

云智能体提供以下优势：
- **AI 驱动**：利用机器学习模型进行更精准的风险评估
- **实时更新**：自动接入最新的制裁名单和风险数据
- **简化集成**：RESTful API 接口，无需 SOAP/WSDL 配置
- **更快响应**：优化的云端基础设施保证低延迟

### 执行模式

通过 `AML_ENFORCEMENT_MODE` 控制 AML 检测的执行策略：

- `block_on_fail`（默认）：仅在明确失败时阻止交易
- `block_on_review`：在需要审核或失败时阻止交易
- `log_only`：仅记录不阻止，用于测试和审计

## 🔒 安全与合规

- 使用 `AuthJwtAccessGuard` 通过 Auth Service 校验并注入用户信息。
- 托管私钥默认保存在数据库中，仅用于演示；生产环境建议替换为 KMS/HSM。
- 转账接口会校验 `dto.from` 地址是否属于当前用户，并将链上错误直接透传为 4xx/5xx 响应。
- 请求日志、Request-ID、Sentry 上报及 i18n 错误文案遵循统一规范。

## 🧪 测试

```bash
npm test            # 运行单元测试
npm run lint        # ESLint + Prettier 检查
```

测试覆盖范围包含数据库封装、哈希工具、gRPC Auth 客户端以及 keystore/transfer 业务逻辑。

## 🐳 Docker

`Dockerfile` 提供多阶段构建，最终镜像仅暴露 HTTP 端口 `9003`。在仓库根目录执行：

```bash
docker compose build chain-service
docker compose up chain-service
```

服务会自动注册到 Kong 与其他微服务所在的 `bw-network` 网络。

## 📚 相关文档

- `docs/new-microservice-guide.md`：仓库级微服务开发规范。
- `docs/chain-service/design.md`：链服务功能与扩展路线图。

如需扩展新的链上能力（例如事件监听、批量转账等），可在 `modules/` 下新增模块并复用现有的配置、鉴权与响应体系。
