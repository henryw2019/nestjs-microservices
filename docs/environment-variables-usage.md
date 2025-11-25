# 环境变量配置使用指南

## 📋 使用方法

### 1. **环境变量加载机制**

所有服务通过 `ConfigModule.forRoot()` 自动加载根目录的 `.env.docker` 文件：

```typescript
// 各服务的 common.module.ts
ConfigModule.forRoot({
    isGlobal: true,
    cache: true,
    envFilePath: ['.env.docker', '.env'], // 自动查找根目录的 .env.docker
    expandVariables: true,
});
```

### 2. **配置读取方式**

服务通过 `ConfigService` 或直接通过 `process.env` 读取配置：

```typescript
// 方式1: 通过 ConfigService (推荐)
constructor(private configService: ConfigService) {
    const dbUrl = this.configService.get<string>('AUTH_DATABASE_URL');
}

// 方式2: 直接通过 process.env
const dbUrl = process.env.AUTH_DATABASE_URL;
```

## 🔧 需要修改的代码

### 1. **Auth Service** - gRPC服务器配置

需要更新 `apps/auth/src/common/config/grpc.config.ts`：

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('grpc', (): IGrpcConfig => {
    return {
        // AuthService 配置
        url: process.env.GRPC_AUTH_URL || process.env.GRPC_URL || '0.0.0.0:50051',
        package: process.env.GRPC_AUTH_PACKAGE || process.env.GRPC_PACKAGE || 'auth',

        // UserService 配置 (同一服务，不同包)
        userUrl: process.env.GRPC_USER_URL || process.env.GRPC_URL || '0.0.0.0:50051',
        userPackage: process.env.GRPC_USER_PACKAGE || 'user',
    };
});
```

### 2. **Chain Service** - gRPC客户端配置

已更新 `apps/chain-service/src/common/config/grpc.config.ts`：

```typescript
export default registerAs('grpc', (): IGrpcConfig => {
    return {
        // 本服务作为gRPC服务器的配置 (如果需要)
        url: process.env.GRPC_URL || '',
        package: process.env.GRPC_PACKAGE || '',

        // 连接外部 Auth Service
        authUrl: process.env.GRPC_CLIENT_AUTH_URL || 'auth-service:50051',
        authPackage: process.env.GRPC_AUTH_PACKAGE || 'auth',

        // 连接外部 User Service (实际由 Auth Service 提供)
        userUrl: process.env.GRPC_CLIENT_USER_URL || 'auth-service:50051',
        userPackage: process.env.GRPC_USER_PACKAGE || 'user',
    };
});
```

### 3. **各服务应用配置更新**

#### Auth Service

```typescript
// apps/auth/src/common/config/app.config.ts
export default registerAs(
    'app',
    (): IAppConfig => ({
        name: process.env.AUTH_APP_NAME || 'auth',
        http: {
            port: parseInt(process.env.HTTP_PORT_AUTH || '9001', 10),
            host: process.env.HTTP_HOST || '::',
        },
        // ... 其他配置
    }),
);
```

#### Chain Service

```typescript
// apps/chain-service/src/common/config/app.config.ts
export default registerAs(
    'app',
    (): IAppConfig => ({
        name: process.env.CHAIN_SERVICE_APP_NAME || 'chain-service',
        http: {
            port: parseInt(process.env.HTTP_PORT_CHAIN_SERVICE || '9003', 10),
            host: process.env.HTTP_HOST || '::',
        },
        // ... 其他配置
    }),
);
```

#### Chain Reader Service

```typescript
// apps/chain-reader/src/common/config/app.config.ts
export default registerAs(
    'app',
    (): IAppConfig => ({
        name: process.env.CHAIN_READER_APP_NAME || 'chain-reader',
        http: {
            port: parseInt(process.env.HTTP_PORT_CHAIN_READER || '9004', 10),
            host: process.env.HTTP_HOST || '::',
        },
        // ... 其他配置
    }),
);
```

### 4. **Redis配置更新**

各服务的 Redis 配置需要使用服务特定的前缀：

```typescript
// apps/auth/src/common/config/redis.config.ts
export default registerAs(
    'redis',
    (): IRedisConfig => ({
        url: process.env.REDIS_URL || '',
        keyPrefix: process.env.REDIS_KEY_PREFIX_AUTH || 'auth:',
        ttl: parseInt(process.env.REDIS_TTL || '3600'),
    }),
);

// apps/chain-service/src/common/config/redis.config.ts
export default registerAs(
    'redis',
    (): IRedisConfig => ({
        url: process.env.REDIS_URL || '',
        keyPrefix: process.env.REDIS_KEY_PREFIX_CHAIN_SERVICE || 'chain-service:',
        ttl: parseInt(process.env.REDIS_TTL || '3600'),
    }),
);
```

### 5. **数据库配置更新**

各服务使用专用的数据库 URL：

```typescript
// apps/auth/src/common/services/database.service.ts
constructor() {
    const pool = new Pool({
        connectionString: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL
    });
    // ...
}

// apps/chain-indexer/src/prisma.service.ts
constructor() {
    const pool = new Pool({
        connectionString: process.env.INDEXER_DATABASE_URL || process.env.DATABASE_URL
    });
    // ...
}
```

## 🚀 迁移步骤

### 第一阶段：环境变量准备

1. ✅ 已创建 `.env.template` 模板文件
2. ✅ 已更新 `.env.docker` 包含所有必要配置
3. ✅ 已创建配置映射文档

### 第二阶段：代码更新

1. 更新各服务的配置文件使用带前缀的环境变量
2. 更新 gRPC 配置支持多服务连接
3. 更新数据库和 Redis 配置使用专用 URL

### 第三阶段：测试验证

1. 本地开发环境测试
2. Docker 环境测试
3. 服务间通信测试

## ⚠️ 注意事项

1. **向后兼容性**: 保留了原有环境变量名作为后备选项
2. **配置优先级**: 服务特定变量 > 通用变量 > 默认值
3. **Docker 环境**: 使用 `auth-service:50051` 而不是 `localhost:50051`
4. **环境隔离**: 开发、测试、生产环境使用不同的 `.env` 文件

## 📝 配置示例

### 开发环境 (.env.local)

```bash
# 本地开发使用 localhost
GRPC_CLIENT_AUTH_URL="localhost:50051"
GRPC_CLIENT_USER_URL="localhost:50051"
ETH_RPC_URL="http://localhost:8545"
```

### Docker 环境 (.env.docker)

```bash
# Docker 环境使用服务名
GRPC_CLIENT_AUTH_URL="auth-service:50051"
GRPC_CLIENT_USER_URL="auth-service:50051"
ETH_RPC_URL="http://host.docker.internal:8545"
```

### 生产环境 (.env.production)

```bash
# 生产环境使用实际的服务地址
GRPC_CLIENT_AUTH_URL="auth-service.prod:50051"
GRPC_CLIENT_USER_URL="auth-service.prod:50051"
ETH_RPC_URL="https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
```
