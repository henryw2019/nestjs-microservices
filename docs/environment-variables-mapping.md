# 环境变量映射表

## 📋 服务配置映射

### 🔐 Auth Service (端口: 9001)
| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 应用名称 | `AUTH_APP_NAME` | "auth" | 服务标识 |
| 数据库 | `AUTH_DATABASE_URL` | - | Auth专用数据库 |
| HTTP端口 | `HTTP_PORT_AUTH` | 9001 | HTTP服务端口 |
| Redis前缀 | `REDIS_KEY_PREFIX_AUTH` | "auth:" | Redis键前缀 |
| gRPC地址 | `GRPC_AUTH_URL` | "0.0.0.0:50051" | AuthService gRPC地址 |
| UserService gRPC | `GRPC_USER_URL` | "0.0.0.0:50051" | UserService gRPC地址 |

### ⛓️ Chain Indexer Service (端口: 9200)
| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 应用名称 | `CHAIN_INDEXER_APP_NAME` | "chain-indexer" | 服务标识 |
| 数据库 | `INDEXER_DATABASE_URL` | - | Indexer专用数据库 |
| HTTP端口 | `HTTP_PORT_CHAIN_INDEXER` | 9200 | HTTP服务端口 |
| RPC地址 | `ETH_RPC_URL` | - | 区块链RPC地址 |
| 链ID | `CHAIN_ID` | 23333 | 区块链网络ID |
| 轮询间隔 | `POLL_INTERVAL_MS` | 5000 | 区块轮询间隔(ms) |
| 批处理大小 | `BATCH_SIZE` | 5 | 每次处理区块数 |
| 超时时间 | `TRANSACTION_TIMEOUT_MS` | 600000 | 交易超时时间(ms) |
| 确认数 | `CONFIRMATIONS` | 12 | 区块确认数 |

### 🔗 Chain Service (端口: 9003)
| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 应用名称 | `CHAIN_SERVICE_APP_NAME` | "chain-service" | 服务标识 |
| 数据库 | `CHAIN_SERVICE_DATABASE_URL` | - | Chain Service专用数据库 |
| HTTP端口 | `HTTP_PORT_CHAIN_SERVICE` | 9003 | HTTP服务端口 |
| Redis前缀 | `REDIS_KEY_PREFIX_CHAIN_SERVICE` | "chain-service:" | Redis键前缀 |
| gRPC地址 | `GRPC_CHAIN_SERVICE_URL` | "" | gRPC服务地址 |
| 连接Auth服务 | `GRPC_CLIENT_AUTH_URL` | "auth-service:50051" | 连接AuthService |
| 连接User服务 | `GRPC_CLIENT_USER_URL` | "auth-service:50051" | 连接UserService |

### 📖 Chain Reader Service (端口: 9004)
| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 应用名称 | `CHAIN_READER_APP_NAME` | "chain-reader" | 服务标识 |
| 数据库 | `CHAIN_READER_DATABASE_URL` | - | 只读数据库 |
| HTTP端口 | `HTTP_PORT_CHAIN_READER` | 9004 | HTTP服务端口 |
| Redis前缀 | `REDIS_KEY_PREFIX_CHAIN_READER` | "chain-reader:" | Redis键前缀 |
| 文档前缀 | `CHAIN_READER_DOC_PREFIX` | "/docs" | API文档路径 |
| 缓存TTL | `CHAIN_READER_CACHE_TTL_SECONDS` | 3 | 缓存生存时间(秒) |
| 最大缓存项 | `CHAIN_READER_CACHE_MAX_ITEMS` | 5000 | 最大缓存条目数 |

## 🔄 代码迁移建议

### 1. 统一ConfigModule配置
```typescript
// 所有服务统一使用以下配置
ConfigModule.forRoot({
    isGlobal: true,
    cache: true,
    envFilePath: ['.env.docker', '.env'], // 移除 ../../.env.docker
    expandVariables: true,
})
```

### 2. 服务配置文件更新
各服务的配置文件应该使用带前缀的环境变量：

```typescript
// auth/src/common/config/app.config.ts
export default registerAs('app', (): IAppConfig => ({
    name: process.env.AUTH_APP_NAME || 'auth',
    http: {
        port: parseInt(process.env.HTTP_PORT_AUTH || '9001', 10),
    },
    // ... 其他配置
}));
```

### 3. 数据库连接更新
```typescript
// 使用服务专用的数据库URL
const connectionString = process.env.AUTH_DATABASE_URL || 
                       process.env.INDEXER_DATABASE_URL || 
                       process.env.CHAIN_SERVICE_DATABASE_URL ||
                       process.env.CHAIN_READER_DATABASE_URL;
```

## ⚠️ 注意事项

1. **向后兼容**: 保留了 `DATABASE_URL`、`GRPC_URL` 等通用变量作为后备
2. **Docker环境**: 使用 `ETH_RPC_URL_DOCKER` 替代 `ETH_RPC_URL`
3. **服务隔离**: 每个服务使用独立的数据库URL和Redis前缀
4. **端口管理**: 每个服务有独立的HTTP端口配置

## 🚀 迁移步骤

1. **更新环境变量文件**: 使用新的 `.env.template` 格式
2. **修改配置文件**: 更新各服务的config文件使用前缀变量
3. **统一ConfigModule**: 所有服务使用相同的配置加载路径
4. **测试验证**: 确保各服务能正确读取对应的配置值