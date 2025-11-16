#!/bin/bash

# 验证所有全局命令是否正确配置

echo "验证全局命令配置..."

# 验证 proto:generate 命令
echo "1. 验证 proto:generate 命令..."
pnpm turbo run proto:generate --dry-run=json | jq -r '.tasks[] | select(.taskId == "auth#proto:generate") | .taskId' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ proto:generate 命令已正确配置"
else
    echo "❌ proto:generate 命令配置有问题"
fi

# 验证 prisma:generate 命令
echo "2. 验证 prisma:generate 命令..."
pnpm turbo run prisma:generate --dry-run=json | jq -r '.tasks[] | select(.taskId == "auth#prisma:generate") | .taskId' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ prisma:generate 命令已正确配置"
else
    echo "❌ prisma:generate 命令配置有问题"
fi

# 验证 prisma:migrate 命令
echo "3. 验证 prisma:migrate 命令..."
pnpm turbo run prisma:migrate --dry-run=json | jq -r '.tasks[] | select(.taskId == "auth#prisma:migrate") | .taskId' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ prisma:migrate 命令已正确配置"
else
    echo "❌ prisma:migrate 命令配置有问题"
fi

# 验证 prisma:migrate:prod 命令
echo "4. 验证 prisma:migrate:prod 命令..."
pnpm turbo run prisma:migrate:prod --dry-run=json | jq -r '.tasks[] | select(.taskId == "auth#prisma:migrate:prod") | .taskId' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ prisma:migrate:prod 命令已正确配置"
else
    echo "❌ prisma:migrate:prod 命令配置有问题"
fi

# 验证 prisma:studio 命令
echo "5. 验证 prisma:studio 命令..."
pnpm turbo run prisma:studio --dry-run=json | jq -r '.tasks[] | select(.taskId == "auth#prisma:studio") | .taskId' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ prisma:studio 命令已正确配置"
else
    echo "❌ prisma:studio 命令配置有问题"
fi

echo "验证完成！"