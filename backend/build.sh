#!/bin/bash

# 为 poePointsMonitor 项目使用 Go 1.25
export PATH="/usr/local/go/bin:$PATH"
export GOROOT="/usr/local/go"

echo "使用 Go 版本: $(go version)"
echo "GOROOT: $GOROOT"

# 清理缓存
go clean -cache -modcache

# 编译
go build -o poe-backend main.go

if [ $? -eq 0 ]; then
    echo "✅ 编译成功！"
else
    echo "❌ 编译失败！"
    exit 1
fi
