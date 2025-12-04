# Poe 积分监控工具

一个用于监控和分析 Poe 积分消耗的可视化工具。

## ✨ 功能特性

- 🔄 **自动拉取数据**: 从 Poe API 自动拉取积分消耗历史，遇到重复记录自动停止
- 💾 **本地存储**: 使用 SQLite 数据库存储所有历史记录
- 📊 **多维度图表**: 
  - 时间粒度：分钟、小时、半天、全天
  - 图表类型：分立（每个时间段独立）、累积（随时间累加）
- 📈 **实时统计**: 显示总体统计和各个机器人的使用情况
- 🎨 **美观界面**: 参考 scoreRecord 项目的 UI 设计

## 🛠️ 技术栈

### 后端
- Go 1.21+
- Gin (Web 框架)
- SQLite3 (数据库)

### 前端
- React 18
- Recharts (图表库)
- Axios (HTTP 客户端)
- Vite (构建工具)

## 📦 安装

### 前置要求

- Go 1.21 或更高版本
- Node.js 16 或更高版本
- npm 或 yarn

### 安装步骤

1. 克隆或下载本项目

2. 安装后端依赖
```bash
cd backend
go mod download
```

3. 安装前端依赖
```bash
cd frontend
npm install
```

## 🚀 启动

### 方式一：使用启动脚本（推荐）

```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

#### 启动后端
```bash
cd backend
go run main.go -port 58232
```

#### 启动前端
```bash
cd frontend
npm run dev:vite
```

## 📖 使用说明

### 1. 获取配置信息

1. 打开浏览器访问 https://poe.com/points_history
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面，找到 `gql_POST` 请求
5. 在 Request Headers 中找到以下字段：
   - `cookie`: 完整的 Cookie 字符串
   - `poe-formkey`: Form Key
   - `poe-tchannel`: TChannel
   - `poe-revision`: Revision（可选，已有默认值）
   - `poe-tag-id`: Tag ID（可选，已有默认值）

### 2. 填写配置并拉取数据

1. 在左侧配置表单中填入获取的配置信息
2. 点击"开始拉取数据"按钮
3. 系统会自动从 Poe API 拉取数据，直到遇到已存在的记录

### 3. 查看图表

- 使用顶部的控制按钮切换时间粒度（分钟/小时/半天/全天）
- 切换图表类型（分立/累积）
- 查看总体统计和机器人使用排行

## 📊 数据说明

### 时间粒度

- **分钟**: 按每分钟统计
- **小时**: 按每小时统计
- **半天**: 将一天分为上午（00:00-11:59）和下午（12:00-23:59）
- **全天**: 按每天统计

### 图表类型

- **分立**: 显示每个时间段的独立消耗
- **累积**: 显示随时间累加的总消耗

## 🗂️ 数据存储

数据存储在：
```
~/Library/Application Support/PoePointsMonitor/
├── points.db        # SQLite 数据库
```

## 📱 打包应用（可选）

### 打包为 macOS 应用

```bash
cd frontend
npm run pack           # ARM64 版本
npm run pack:intel     # Intel 版本
```

打包后的应用在 `frontend/release/` 目录下。

## 🔧 API 接口

### 后端 API (http://localhost:58232/api)

- `POST /fetch`: 拉取 Poe 积分历史数据
- `GET /stats`: 获取统计数据（支持参数：granularity, type）
- `GET /records`: 获取最新记录
- `GET /bot-stats`: 获取机器人统计

## 🎨 界面预览

- 渐变紫色导航栏
- 卡片式布局
- 平滑的动画效果
- 响应式设计

## 📝 注意事项

1. Cookie 和 Token 会过期，需要定期更新
2. 请求频率限制：每次翻页间隔 1 秒
3. 数据拉取时会自动停止在已存在的记录处
4. 建议定期拉取数据以保持最新

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

UI 设计参考了 scoreRecord 项目。

