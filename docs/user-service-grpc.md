# UserService gRPC Implementation

## 概述

为了更清晰地分离鉴权与用户数据管理，我们创建了一个新的 gRPC 服务 `UserService`，独立于 `AuthService`。

## 实现的文件

### Auth Service (服务端)

#### 1. Proto 定义
**文件**: `apps/auth/src/protos/user.proto`

定义了 UserService 的 gRPC 接口，包括：
- `GetUserById`: 根据用户 ID 获取用户信息
- `GetUserByEmail`: 根据用户邮箱获取用户信息

#### 2. 生成的 TypeScript 接口
**文件**: `apps/auth/src/generated/user.ts`

使用命令 `npx nestjs-grpc generate` 自动生成，包含：
- `UserServiceClient`: 客户端接口
- `UserServiceInterface`: 服务端接口
- Request/Response 类型定义

#### 3. gRPC 服务实现
**文件**: `apps/auth/src/modules/user/services/user.grpc.service.ts`

实现了 UserService 的业务逻辑：
```typescript
export class UserGrpcService {
    async getUserById(request: GetUserByIdRequest): Promise<GetUserByIdResponse>
    async getUserByEmail(request: GetUserByEmailRequest): Promise<GetUserByEmailResponse>
}
```

#### 4. gRPC 控制器
**文件**: `apps/auth/src/app/user.grpc.controller.ts`

暴露 gRPC 端点：
```typescript
@GrpcController('UserService')
export class UserGrpcController {
    @GrpcMethod('GetUserById')
    async getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse>
    
    @GrpcMethod('GetUserByEmail')
    async getUserByEmail(data: GetUserByEmailRequest): Promise<GetUserByEmailResponse>
}
```

#### 5. 模块注册
**文件**: 
- `apps/auth/src/modules/user/user.module.ts` - 添加 UserGrpcService 到 providers
- `apps/auth/src/app/app.module.ts` - 注册 UserService gRPC provider 和 UserGrpcController

### Chain Service (客户端)

#### 1. Proto 文件
**文件**: `apps/chain-service/src/protos/user.proto`

与 auth service 相同的 proto 定义

#### 2. 生成的 TypeScript 接口
**文件**: `apps/chain-service/src/generated/user.ts`

客户端使用的类型定义

#### 3. gRPC 客户端服务
**文件**: `apps/chain-service/src/services/user/grpc.user.service.ts`

客户端调用实现：
```typescript
export class GrpcUserService {
    async getUserById(userId: string): Promise<GetUserByIdResponse>
    async getUserByEmail(email: string): Promise<GetUserByEmailResponse>
}
```

#### 4. gRPC 客户端模块
**文件**: `apps/chain-service/src/services/user/grpc.user.module.ts`

配置 UserService gRPC 客户端连接

#### 5. 更新
**文件**: `apps/chain-service/src/common/common.module.ts`

添加 GrpcUserModule 到全局模块导入

**文件**: `apps/chain-service/src/services/auth/grpc.auth.service.ts`

移除了 getUserById 和 getUserByEmail 方法，这些方法现在在 UserService 中

## 使用示例

### 在 Chain Service 中使用 UserService

```typescript
import { Injectable } from '@nestjs/common';
import { GrpcUserService } from '@/services/user/grpc.user.service';

@Injectable()
export class ExampleService {
    constructor(private readonly grpcUserService: GrpcUserService) {}

    async getUserInfo(userId: string) {
        // 通过 ID 获取用户
        const response = await this.grpcUserService.getUserById(userId);
        
        if (response.success && response.user) {
            console.log('User:', response.user);
            return response.user;
        }
        
        throw new NotFoundException('User not found');
    }

    async getUserByEmail(email: string) {
        // 通过邮箱获取用户
        const response = await this.grpcUserService.getUserByEmail(email);
        
        if (response.success && response.user) {
            return response.user;
        }
        
        throw new NotFoundException('User not found');
    }
}
```

### 在 Transfer Service 中验证用户

```typescript
@Injectable()
export class TransferService {
    constructor(
        private readonly keyStoreService: KeyStoreService,
        private readonly grpcUserService: GrpcUserService,
    ) {}

    async sendNative(userId: string, dto: TransferDto) {
        // 验证用户存在
        const userResponse = await this.grpcUserService.getUserById(userId);
        if (!userResponse.success || !userResponse.user) {
            throw new NotFoundException('User not found');
        }

        // 继续转账逻辑...
    }
}
```

## 架构优势

1. **关注点分离**: AuthService 专注于身份验证，UserService 专注于用户数据
2. **清晰的 API**: 明确的服务边界和职责
3. **类型安全**: 完整的 TypeScript 类型支持
4. **可扩展性**: 易于添加新的用户相关方法
5. **独立演化**: 两个服务可以独立更新和部署

## 生成代码命令

```bash
# 在 auth service 中生成
cd apps/auth
npx nestjs-grpc generate --proto ./src/protos --output ./src/generated

# 在 chain-service 中生成
cd apps/chain-service
npx nestjs-grpc generate --proto ./src/protos --output ./src/generated
```

## 配置要求

确保 `.env` 文件中有以下配置：

```env
# Auth Service
GRPC_URL=0.0.0.0:50051

# Chain Service
GRPC_AUTH_URL=auth:50051  # 指向 auth service 的 gRPC 端点
```

## API 响应格式

### GetUserByIdResponse / GetUserByEmailResponse

```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    avatar: string;
    isVerified: boolean;
    role: string;
    createdAt: string;  // ISO 8601 格式
    updatedAt: string;  // ISO 8601 格式
  };
}
```

### 成功响应示例

```json
{
  "success": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "avatar": "https://example.com/avatar.jpg",
    "isVerified": true,
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 失败响应示例

```json
{
  "success": false,
  "user": null
}
```
