#!/bin/bash

# Poe 积分监控工具启动脚本

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Poe 积分监控工具启动脚本            ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo ""

# 检查 Go 是否安装
if ! command -v go &> /dev/null; then
    echo -e "${YELLOW}⚠️  未检测到 Go，请先安装 Go${NC}"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  未检测到 Node.js，请先安装 Node.js${NC}"
    exit 1
fi

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 后端目录
BACKEND_DIR="$DIR/backend"
# 前端目录
FRONTEND_DIR="$DIR/frontend"

# 1. 启动后端
echo -e "${GREEN}🚀 启动后端服务...${NC}"
cd "$BACKEND_DIR"

# 检查 go.mod 依赖
if [ ! -f "go.sum" ]; then
    echo -e "${BLUE}📦 首次运行，下载 Go 依赖...${NC}"
    go mod download
fi

# 启动后端服务（后台运行）
go run main.go -port 58232 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}"

# 2. 启动前端
echo -e "${GREEN}🚀 启动前端服务...${NC}"
cd "$FRONTEND_DIR"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 首次运行，安装 npm 依赖...${NC}"
    npm install
fi

# 启动前端开发服务器
echo -e "${GREEN}✅ 前端开发服务器启动中...${NC}"
npm run dev:vite &
FRONTEND_PID=$!

# 等待几秒让服务器启动
sleep 3

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           服务启动成功！                  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  后端服务: http://localhost:58232       ║${NC}"
echo -e "${GREEN}║  前端服务: http://localhost:58233       ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  按 Ctrl+C 停止服务                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 正在停止服务...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ 服务已停止${NC}"
    exit 0
}

# 捕获 Ctrl+C
trap cleanup SIGINT SIGTERM

# 保持脚本运行
wait

