# Chain Indexer 服务设计文档

## 目标
设计一个独立的微服务（Chain Indexer），其职责是从指定的以太坊链（主网或自定义测试网）同步链上数据到关系型数据库（Postgres）。被索引的数据包括：

- 地址余额（ETH 与 ERC20 token）
- 地址的交易记录（ETH 转账）
- ERC20 代币的转账事件（Transfer 事件）
- ERC20 token 的元信息（symbol、decimals、name，当需要时抓取）

该服务为其他微服务（如 auth/post/chain-service）提供内部查询 API 或通过共享数据库访问数据。

## 技术选型
- 语言/框架：Node.js + TypeScript + NestJS
- 区块链库：ethers.js 或 web3.js（推荐 ethers.js v6）
- 数据库：Postgres（与当前仓库一致）
- 队列/消息：使用 Redis Streams 或 RabbitMQ 进行异步任务与重试
- 可选：Elasticsearch/Meili for full-text search 或更复杂查询

## 高级架构

- Poller / Block Listener：
  - 支持两种模式：轮询（polling）和 WebSocket 订阅（ws provider）。
  - 推荐：主用轮询（更稳定、可重试），在支持的环境下同时开启 ws 以减少延迟。

- Worker Pool：多个 worker 并行处理区块范围（解析 tx、logs），并将结果写入 DB。
- Dedup & Idempotency：通过区块号+交易哈希+log index 做幂等写入，确保重试安全。
- Checkpoint / Cursor：在 DB 中存储最新已处理区块号，支持恢复与并行切分区块范围。

## 数据模型（Postgres 关键表）

- blocks
  - id (bigint, primary) - block number
  - hash
  - timestamp

- txs
  - hash (pk)
  - block_number
  - from_address
  - to_address
  - value (numeric)
  - gas_used, gas_price
  - input
  - raw_rlp (optional)

- erc20_transfers
  - id (bigserial)
  - tx_hash
  - log_index
  - block_number
  - token_address
  - from_address
  - to_address
  - value (numeric)

- token_meta
  - token_address (pk)
  - symbol
  - name
  - decimals
  - last_updated

- address_balances
  - id
  - address
  - token_address (nullable for ETH)
  - balance (numeric)
  - last_updated_block

- checkpoints
  - chain_id
  - last_processed_block

## 同步策略

1. 初始化：读取 `checkpoints`，若为空，则回退到配置的起始区块（例如 latest - 1000 或配置的 genesis）。
2. 轮询流程：
   - 获取 latestBlock = provider.getBlockNumber()
   - 以可配置批次大小（例如 10-100）并行抓取区块并处理。
   - 对每个区块：保存 block、解析 txs、解析 logs（过滤 ERC20 Transfer 事件）、写入 txs 与 erc20_transfers
   - 更新 address_balances：
     - 最可靠但昂贵的方法：对受影响地址调用 provider.getBalance 与 token contract balanceOf
     - 更常用的方法：通过解析 txs 与 Transfer 事件累积增减变更，并周期性做一次全量/差分校验
3. 异常处理：失败重试、报错告警与死信队列。

## API（供内部服务查询）
- GET /internal/indexer/status -> current synced block, lag, health
- GET /internal/address/:address/balances -> 返回 ETH + token balances
- GET /internal/address/:address/txs?limit=&page=
- GET /internal/token/:tokenAddress/transfers?limit=&page=

## 扩展与性能优化
- 使用分片/队列并行处理区块，写入分批批量插入
- 对频繁查询的地址/token 使用 Redis 缓存
- 当索引历史数据时使用后端批处理作业（ETL）而非在线处理

## 运维
- 监控指标：同步延迟（latest - processedBlock）、处理速率、错误率
- 备份：数据库定期备份；token_meta 可缓存并在失效时重新抓取
- 安全：私钥不在索引器中出现，索引器只做只读/解析工作

## TODO / 可选
- 支持更多事件类型（ERC721/1155、合约方法调用追踪）
- 支持链回滚（reorg）处理：仅在确认块深度 > N 后才写入最终状态
- 支持自定义插件用于解析特定合约事件

## 追踪智能合约事件（扩展性设计）

目标：对代币合约或任意智能合约的关键事件（例如 mint、burn、Transfer、Approval、角色/权限变更、OwnershipTransferred 等）做通用且可扩展的追踪与存储，以便其它微服务查询和触发业务流程。

设计要点：

- 通用事件表（events）
  - id (bigserial)
  - chain_id
  - block_number
  - block_hash
  - tx_hash
  - log_index
  - contract_address
  - event_name
  - event_signature (topic0)
  - indexed_args JSONB (常用于 indexed topics：from/to/tokenId 等)
  - data_args JSONB (非 indexed 的 event 参数)
  - raw_data JSONB (完整 log 以便后续解析)
  - processed boolean (是否已被上层插件/consumer 处理)

- 专用事件表（可选）
  - 对于高频或结构化强的事件（如 erc20_transfers）继续使用专表以便高性能查询。

- 插件/解析器模式
  - 为每个关注的合约或合约类型提供一个解析器（parser/handler）接口：
    - match(log): boolean — 决定是否由该解析器处理该 log（基于 contract address 或 event signature）
    - parse(log): { eventName, args } — 将 raw log 解析成结构化对象
    - handle(parsedEvent): side effects — 将解析后的事件映射到业务表或触发消息
  - 解析器通过配置注册到 indexer（例如按 contract address 或 topic0 注册）。

- 幂等性与去重
  - 使用 (tx_hash, log_index) 或 (block_number, tx_hash, log_index) 做唯一约束，避免重复写入

- reorg（链回滚）处理
  - 仅当块深度（confirmations） >= CONFIRMATION_THRESHOLD（可配置，典型 12）时，将事件标记为 final 并写入最终业务表；
  - 对于短期回滚，indexer 需要能够回滚到更早的 checkpoint 并重新处理区块（将原 events 标记为回滚，再重新入库）；

- 异步消费与通知
  - 解析器 handle 可以把事件推送到消息队列（Redis Stream / RabbitMQ / Kafka），供其它微服务消费并处理（例如发邮件、更新余额、触发清算流程等）。

- 权限/角色事件（示例）
  - 关注事件：RoleGranted/RoleRevoked（AccessControl 合约）、OwnershipTransferred、MinterAdded/MinterRemoved 等。
  - 对这些事件，解析器应提取受影响地址/角色，并写入专门的表或发送变更通知给权限管理服务。

- 数据保留与冷热分离
  - 原始 event log 保留用于审计（cold storage 或长期 DB 表），解析后的业务表（例如 token balances / transfers）用于热点查询。

示例工作流：当 indexer 遇到 Transfer event：
1. 将 log 存入 `events` 表（去重）。
2. 匹配到 erc20 parser，将 parsed record 写入 `erc20_transfers`（专表）。
3. 将受影响地址加入到批量余额刷新队列，异步更新 `address_balances`。
4. 将事件经消息队列发送给 `post-service`/`chain-service` 等需要消费的服务。

实现建议：
- 提供动态注册的 parser 目录（类似 plugins/），在运行时可加载/下线。
- 在 parser 中提供 sandboxed 执行与错误隔离，避免单个 parser 导致 indexer 停摆。
- 增加事件处理的重试与死信队列支持。

以上为通用事件追踪设计；如果你愿意，我可以把这套设计实现为 skeleton（包含 parser 插件接口、events 表 migration、以及一个示例 erc20 parser）。


---
文档为设计级别草案，需要根据你的实际需求（例如目标链、同步起始高度、吞吐目标）进一步细化，我可以继续把设计转为可运行的 skeleton（包含 NestJS 服务、基本 DB migration、Worker skeleton）。