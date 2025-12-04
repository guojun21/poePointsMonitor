# 构建与部署指南

## 🏗️ 开发环境搭建

### 前置要求

确保你的系统已安装：

- **Go**: 1.21 或更高版本
  ```bash
  go version  # 验证安装
  ```

- **Node.js**: 16 或更高版本
  ```bash
  node --version  # 验证安装
  npm --version   # 验证安装
  ```

- **Git** (可选): 用于版本控制

---

## 📦 依赖安装

### 后端依赖

```bash
cd backend
go mod download
```

这将下载以下依赖：
- `github.com/gin-gonic/gin`: Web 框架
- `github.com/mattn/go-sqlite3`: SQLite 驱动

### 前端依赖

```bash
cd frontend
npm install
```

这将安装以下依赖：
- `react`: UI 框架
- `recharts`: 图表库
- `axios`: HTTP 客户端
- `vite`: 构建工具
- `electron`: 桌面应用框架（可选）

---

## 🚀 运行开发环境

### 方式一：使用启动脚本（推荐）

```bash
# 在项目根目录
chmod +x start.sh
./start.sh
```

这将：
1. 启动后端服务（端口 58232）
2. 启动前端开发服务器（端口 5174）
3. 自动打开浏览器

按 `Ctrl+C` 停止所有服务。

---

### 方式二：分别启动

#### 启动后端

```bash
cd backend
go run main.go -port 58232
```

后端日志会显示：
```
Database path: /Users/xxx/Library/Application Support/PoePointsMonitor/points.db
Server starting on port 58232...
```

#### 启动前端

在新的终端窗口：

```bash
cd frontend
npm run dev:vite
```

前端会启动在 `http://localhost:5174`

---

## 🔨 构建生产版本

### 构建前端静态文件

```bash
cd frontend
npm run build
```

构建产物在 `frontend/dist/` 目录。

---

### 构建后端可执行文件

#### macOS (ARM64 - M1/M2/M3)

```bash
cd backend
GOOS=darwin GOARCH=arm64 go build -o poe-points-backend main.go
```

#### macOS (Intel - x86_64)

```bash
cd backend
GOOS=darwin GOARCH=amd64 go build -o poe-points-backend main.go
```

#### Linux (x86_64)

```bash
cd backend
GOOS=linux GOARCH=amd64 go build -o poe-points-backend main.go
```

#### Windows (x86_64)

```bash
cd backend
GOOS=windows GOARCH=amd64 go build -o poe-points-backend.exe main.go
```

---

## 📱 打包为桌面应用 (Electron)

### 准备

确保已经构建了前端和后端：

```bash
cd frontend
npm run build
```

### 打包 macOS 应用

#### ARM64 版本 (M1/M2/M3)

```bash
cd frontend
npm run pack
```

#### Intel 版本 (x86_64)

```bash
cd frontend
npm run pack:intel
```

### 打包产物

打包后的文件在 `frontend/release/` 目录：

```
release/
├── ScoreRecord-1.0.0.dmg           # Intel 版 DMG
├── ScoreRecord-1.0.0-arm64.dmg     # ARM64 版 DMG
├── ScoreRecord-1.0.0-mac.zip       # Intel 版 ZIP
└── mac/ 或 mac-arm64/              # 应用目录
    └── ScoreRecord.app/
```

### 安装应用

1. 打开 `.dmg` 文件
2. 将 `PoePointsMonitor.app` 拖到 Applications 文件夹
3. 首次运行时可能需要：
   - 右键点击 → 打开（绕过 Gatekeeper）
   - 或在 系统设置 → 隐私与安全性 中允许

---

## 🧪 测试

### 后端测试

#### 测试数据库初始化

```bash
cd backend
go run main.go
```

检查是否创建了数据库文件：
```bash
ls ~/Library/Application\ Support/PoePointsMonitor/
# 应该看到 points.db
```

#### 测试 API

启动后端后，在浏览器或使用 curl 测试：

```bash
# 测试统计接口（应该返回空数组）
curl http://localhost:58232/api/stats?granularity=hour&type=discrete

# 测试机器人统计（应该返回空数组）
curl http://localhost:58232/api/bot-stats
```

---

### 前端测试

```bash
cd frontend
npm run dev:vite
```

访问 `http://localhost:5174`，检查：
- [ ] 页面正常加载
- [ ] 配置表单显示正常
- [ ] 图表区域显示"暂无数据"提示
- [ ] 统计卡片显示 0

---

## 🐛 常见构建问题

### Go 依赖下载失败

**问题**: `go mod download` 超时或失败

**解决方法**:
```bash
# 设置 Go 代理（中国大陆）
export GOPROXY=https://goproxy.cn,direct
go mod download
```

---

### SQLite 编译错误

**问题**: `go-sqlite3` 编译失败

**可能原因**: 缺少 C 编译器

**解决方法**:
- **macOS**: 安装 Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```

- **Linux**: 安装 gcc
  ```bash
  sudo apt-get install build-essential  # Ubuntu/Debian
  sudo yum install gcc                  # CentOS/RHEL
  ```

---

### npm 安装慢

**问题**: `npm install` 很慢或超时

**解决方法**:
```bash
# 使用淘宝镜像（中国大陆）
npm config set registry https://registry.npmmirror.com
npm install
```

---

### Electron 打包失败

**问题**: `electron-builder` 打包失败

**解决方法**:
1. 确保后端已编译：
   ```bash
   cd frontend
   npm run build:backend
   # 或 npm run build:backend:intel
   ```

2. 检查 `frontend/dist/poe-points-backend` 是否存在

3. 重新打包：
   ```bash
   npm run pack
   ```

---

## 📂 构建产物说明

### 开发构建

```
backend/
└── (无产物，直接运行 go run)

frontend/
└── node_modules/  (依赖)
```

### 生产构建

```
backend/
└── poe-points-backend  (可执行文件)

frontend/
├── dist/               (前端静态文件)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── poe-points-backend  (后端可执行文件的副本)
└── release/            (Electron 打包)
    ├── *.dmg
    ├── *.zip
    └── mac/ 或 mac-arm64/
```

---

## 🔐 代码签名（可选）

如果要分发应用，建议进行代码签名：

### macOS

```bash
# 需要 Apple Developer 账号
codesign --force --deep --sign "Developer ID Application: Your Name" PoePointsMonitor.app
```

### 公证（Notarization）

```bash
# 提交公证
xcrun notarytool submit PoePointsMonitor.dmg \
  --apple-id your@email.com \
  --password your-app-specific-password \
  --team-id YOUR_TEAM_ID

# 查看状态
xcrun notarytool info SUBMISSION_ID \
  --apple-id your@email.com \
  --password your-app-specific-password

# 附加公证票据
xcrun stapler staple PoePointsMonitor.dmg
```

---

## 📊 性能优化

### 后端优化

1. **编译优化**:
   ```bash
   go build -ldflags="-s -w" -o poe-points-backend main.go
   ```
   - `-s`: 去除符号表
   - `-w`: 去除调试信息
   - 可减少约 30% 的文件大小

2. **数据库优化**:
   - 已添加索引（`idx_creation_time`, `idx_created_at`）
   - 使用 COALESCE 处理 NULL 值

### 前端优化

1. **生产构建已启用**:
   - Tree shaking
   - 代码压缩
   - 资源哈希化

2. **可选优化**:
   - 启用 gzip 压缩
   - 使用 CDN 加载依赖

---

## 🚢 部署选项

### 选项 1: 桌面应用（推荐）

使用 Electron 打包，适合个人使用：
- ✅ 无需服务器
- ✅ 数据本地存储
- ✅ 一键启动

### 选项 2: Web 应用

部署到服务器，适合团队使用：

**后端**:
```bash
# 使用 systemd (Linux)
[Unit]
Description=Poe Points Monitor Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/poePointsMonitor
ExecStart=/opt/poePointsMonitor/poe-points-backend -port 58232
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**前端**:
使用 Nginx 托管静态文件：
```nginx
server {
    listen 80;
    server_name poe-monitor.example.com;
    
    root /var/www/poePointsMonitor/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:58232;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ 构建检查清单

部署前检查：

- [ ] Go 版本 >= 1.21
- [ ] Node.js 版本 >= 16
- [ ] 后端依赖已下载
- [ ] 前端依赖已安装
- [ ] 数据库目录可写
- [ ] 端口 58232 和 5174 未被占用
- [ ] 测试后端 API 响应正常
- [ ] 测试前端页面加载正常
- [ ] (可选) Electron 打包成功
- [ ] (可选) 代码签名完成

---

**构建愉快！** 🎉

