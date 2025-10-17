# Chain Service Design

## 目标
新增 `chain-service` 微服务，提供以太坊链上读取与操作能力，供前端调用。功能包括：

- 查询 ETH 地址余额（以太币）
- 查询地址交易记录（提示：完整交易记录需依赖索引器，如 Etherscan/TheGraph）
- 查询 ERC20 代币余额与代币交易记录
- 发起 ETH 与 ERC20 转账
- 管理员（admin）权限发起 ERC20 mint/burn 操作（需合约支持）

## 技术栈
- NestJS (TypeScript)
- ethers.js（与以太坊交互）
- 可选：TheGraph / Etherscan API 用于查询交易历史和 token 转账历史

## 项目结构（概要）
```
chain-service/
  package.json
  Dockerfile
  src/
    main.ts
    app.module.ts
    chain/
      chain.module.ts
      chain.controller.ts
      chain.service.ts
  .env.example
docs/
  chain-service/
    design.md
```

## 环境变量（.env）
- ETH_RPC_URL - 以太坊节点 URL（例如 Infura/Alchemy/本地 geth）
- PORT - 服务监听端口
- ADMIN_API_KEY - 管理员操作的密钥（用于 API 权限校验，建议结合更严密的鉴权）

## API 设计（HTTP REST）
前置：所有 API 前缀为 `/v1/chain`

1. GET /v1/chain/balance?address={address}
   - 功能：返回 ETH 余额
   - 返回示例：{ address, balance }

2. GET /v1/chain/txs?address={address}&limit=10
   - 功能：返回最近交易列表（推荐使用索引器）
   - 返回示例：{ address, limit, note }

3. GET /v1/chain/erc20/txs?address={address}&token={tokenAddress}
   - 功能：返回 ERC20 转账记录（依赖索引器）

4. POST /v1/chain/transfer/eth
   - 功能：从私钥转出 ETH
   - Body: { fromPrivateKey, to, amount }

5. POST /v1/chain/transfer/erc20
   - 功能：从私钥转出 ERC20 代币
   - Body: { fromPrivateKey, to, amount, tokenAddress }

6. POST /v1/chain/erc20/mint
   - 功能：管理员对 ERC20 合约进行 mint
   - Body: { adminApiKey, adminPrivateKey, tokenAddress, to, amount }
   - 权限：需要校验 adminApiKey 或其他 auth

7. POST /v1/chain/erc20/burn
   - 功能：管理员对 ERC20 合约进行 burn（或调用 burnFrom）
   - Body: { adminApiKey, adminPrivateKey, tokenAddress, from, amount }

## 权限与安全
- 查询接口为公开接口（无需认证）——例如 `GET /v1/chain/balance`、`GET /v1/chain/txs`。这些仅执行链上只读查询。
- 写操作（转账、ERC20 mint/burn 等）必须验证操作权限：
   - 优先方式：客户端在链上用私钥签名并提交完整的已签名原始交易（raw signedTx）给服务端，服务端在广播前解析并验证签名者地址。服务器会对 declaredFromAddress（可选）与签名内的发送者地址做比对以确认所有权。
   - 备选方式（仅限受控/内部环境）：将私钥发送到后端，由服务端签名并广播（不推荐）。
   - 管理操作（mint/burn）可额外要求 `ADMIN_API_KEY`（与 `ADMIN_API_KEY` 环境变量比对）并结合审计/白名单。
- 强烈建议：
   - 前端不要把私钥在公网传输；生产建议使用用户端钱包（MetaMask / WalletConnect）签名并只把 signedTx 发送到后端或直接在客户端广播。
   - 管理密钥使用 KMS/HSM，启用密钥轮换与审计日志。
   - 对已签名交易进行 nonce、重放防护和速率限制。
  
### 托管钱包（Custodial）模式
本服务支持托管钱包模式，即用户和管理员的私钥可以安全地存储在服务端（KeyStore）。在此模式下：

- 当用户 A 发起转账时（例如从 addressA 转到 addressB），服务端会：
   1. 在数据库或 KeyStore 中查找 ownerId 对应的 addressA 的私钥；
   2. 使用私钥在服务器端对交易进行签名；
   3. 广播 signedTx 到链上并返回交易哈希。

- 风险与建议：
   - 私钥集中存储会增加被盗风险。生产环境强烈建议将私钥放入专用的 KMS/HSM，并对签名操作做审批与审计；
   - KeyStore 应实现访问控制、密钥加密（静态加密 + 解密由 KMS 执行）、审计日志、速率限制与多重签名（如果可能）；
   - 在本仓库示例中提供了一个简单的文件 KeyStore（`chain-service/src/chain/keystore.service.ts`），仅用于演示和本地测试，不能用于生产。

## 依赖与扩展点
- 交易历史/代币交易需要第三方索引服务（Etherscan / TheGraph / 自建 indexer）
- 支持 ERC20 合约多 decimals，mint/burn 依赖合约接口

## 部署建议
- 将服务加入 docker-compose，暴露端口（例如 9100），并使用内部网络连接到其他服务
- 将 ETH 节点 URL 存入 secrets（不要直接写在 repo）

## 下一步实现清单
- 集成 TheGraph/Etherscan 查询历史（或提供简单 stub）
- 实现更严格的鉴权（JWT、API Key、admin role）
- 增加单元测试和集成测试
- 提供示例 UI 或 Postman collection
