# 创建网络

docker network create mynetwork

# 启动基础设施容器

docker compose -f docker-compose-infra.yml up -d

# 启动开发容器

docker run -d --name dev --network mynetwork `  --network-alias auth-service`
--network-alias chain-service `  --network-alias chain-reader`
--network-alias chain-indexer `  -v "$(Get-Location):/app"`
-p 9001:9001 -p 9003:9003 -p 9004:9004 `
node:22-alpine sh -c "tail -f /dev/null"

docker run -d --name dev --network mynetwork --network-alias auth-service --network-alias chain-service --network-alias chain-reader --network-alias chain-indexer -v $(pwd):/app -p 9001:9001 -p 9003:9003 -p 9004:9004 myrepo:dev sh -c "tail -f /dev/null"

docker run -d --name dev --network mynetwork --network-alias auth-service --network-alias chain-service --network-alias chain-reader --network-alias chain-indexer -v $(pwd):/app -p 9001:9001 -p 9003:9003 -p 9004:9004 node:22-alpine sh -c "tail -f /dev/null"

# 制作开发镜像
docker commit dev dev:1118-v3
docker save dev:1118-v3 | gzip > dev-1118-v3.tar.gz

## AML 反洗钱扫描（chain-service）

chain-service 在发起转账前调用外部 SOAP 反洗钱系统进行实时扫描，并将请求/响应落库用于审计；扫描未终态时由定时任务轮询查询。

环境变量（.env 或 .env.docker）：

```
# SOAP/WSDL
AML_WSDL_URL=
AML_ENDPOINT=
AML_USERNAME=
AML_PASSWORD=

# 网络与重试
AML_TIMEOUT_MS=15000
AML_RETRY_ATTEMPTS=2
AML_RETRY_DELAY_MS=500

# 执行策略：block_on_fail | block_on_review | log_only
AML_ENFORCEMENT_MODE=block_on_fail
```

数据库模型（Prisma）：
- `aml_scans`：扫描主记录（双方用户、地址、请求快照、最后响应、状态、txHash、correlationId 等）。
- `aml_scan_events`：事件流水（REQUEST/RESPONSE/ERROR）保存完整报文。

主要代码：
- `apps/chain-service/src/modules/aml/aml.soap.client.ts`：SOAP 客户端（实时扫描/结果查询）。
- `apps/chain-service/src/modules/aml/aml.service.ts`：编排入库、状态映射、阻断策略与回填 txHash。
- `apps/chain-service/src/modules/aml/aml.poller.ts`：每分钟轮询未终态记录更新结果。
- `apps/chain-service/src/modules/keystore/transfer.service.ts`：转账前触发扫描、按策略阻断。

初始化数据库与生成客户端：

```bash
pnpm -F chain-service prisma:migrate
pnpm -F chain-service prisma:generate
```