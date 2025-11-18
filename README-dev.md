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
docker commit dev dev:1117
docker save dev:1117 | gzip > dev-1117.tar.gz