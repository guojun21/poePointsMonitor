# Poe 积分监控工具 - 项目概览

## 📋 项目需求

根据用户提供的 curl 命令和返回数据，开发一个自动监控 Poe 积分消耗的工具。

### 核心需求

1. **数据采集**
   - 调用 Poe API (`https://poe.com/api/gql_POST`)
   - 自动滚动分页获取历史数据
   - 存储到 SQLite 数据库
   - 遇到重复记录自动停止

2. **数据可视化**
   - 多时间维度：分钟、小时、半天、全天
   - 两种图表类型：
     - 分立：每个时间段的独立数据
     - 累积：随时间累加的总数据
   - 折线图/面积图展示

3. **UI 设计**
   - 参考 `scoreRecord` 项目的 UI 风格
   - 美观、现代、响应式

## 🏗️ 项目架构

### 技术选型

```
后端：Go + Gin + SQLite
前端：React + Recharts + Vite
打包：Electron（可选）
```

### 目录结构

```
poePointsMonitor/
├── backend/                 # Go 后端
│   ├── main.go             # 主程序
│   ├── go.mod              # Go 依赖
│   └── go.sum              # Go 依赖锁定
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # React 组件
│   │   │   ├── common/    # 通用组件（Card、Button、Input）
│   │   │   ├── layout/    # 布局组件（Navbar、Footer、PageContainer）
│   │   │   ├── chart/     # 图表组件（PointsChart）
│   │   │   ├── ConfigForm.jsx    # 配置表单
│   │   │   ├── StatsCard.jsx     # 统计卡片
│   │   │   └── index.js   # 组件导出
│   │   ├── App.jsx         # 主应用
│   │   ├── App.css         # 应用样式
│   │   ├── main.jsx        # 入口文件
│   │   └── index.css       # 全局样式
│   ├── public/             # 静态资源
│   ├── index.html          # HTML 模板
│   ├── package.json        # npm 配置
│   ├── vite.config.js      # Vite 配置
│   └── main.cjs            # Electron 主进程
├── start.sh                # 启动脚本
├── README.md               # 项目文档
├── QUICK_START.md          # 快速开始指南
├── PROJECT_OVERVIEW.md     # 项目概览（本文件）
└── .gitignore              # Git 忽略文件
```

## 🔌 API 设计

### 后端接口

#### 1. POST /api/fetch
拉取 Poe 积分历史数据

**请求体：**
```json
{
  "cookie": "完整的 Cookie 字符串",
  "form_key": "poe-formkey 值",
  "tchannel": "poe-tchannel 值",
  "revision": "poe-revision 值（可选）",
  "tag_id": "poe-tag-id 值（可选）"
}
```

**响应：**
```json
{
  "new_records": 123,
  "message": "Successfully fetched 123 new records"
}
```

#### 2. GET /api/stats
获取统计数据

**查询参数：**
- `granularity`: 时间粒度（minute, hour, halfday, day）
- `type`: 图表类型（discrete, cumulative）

**响应：**
```json
[
  {
    "timestamp": "2025-12-01 10:00",
    "point_cost": 12345,
    "record_count": 67
  },
  ...
]
```

#### 3. GET /api/records
获取最新记录

**查询参数：**
- `limit`: 返回记录数（默认 20）

**响应：**
```json
[
  {
    "id": "QXBpUG9pbnRzSGlzdG9yeU5vZGU6Mjk5NDQ2NDYxMDQ5",
    "point_cost": 3014,
    "creation_time": 1764560727525713,
    "bot_name": "ChatGPT-4o-Latest",
    "bot_id": "Qm90OjMwMTk=",
    "cursor": "299446461049",
    "created_at": "2025-12-01T11:45:27Z"
  },
  ...
]
```

#### 4. GET /api/bot-stats
获取机器人统计

**响应：**
```json
[
  {
    "bot_name": "ChatGPT-4o-Latest",
    "total_cost": 45678,
    "count": 123
  },
  ...
]
```

## 💾 数据库设计

### 表：points_history

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，来自 Poe API |
| point_cost | INTEGER | 积分消耗 |
| creation_time | INTEGER | 创建时间（微秒时间戳）|
| bot_name | TEXT | 机器人名称 |
| bot_id | TEXT | 机器人 ID |
| cursor | TEXT | 分页游标 |
| created_at | DATETIME | 插入时间 |

**索引：**
- `idx_creation_time`: 按创建时间索引
- `idx_created_at`: 按插入时间索引

## 🎨 UI 设计

### 设计理念

参考 `scoreRecord` 项目：
- **配色方案**：渐变紫色主题（#667eea → #764ba2）
- **布局方式**：左侧配置栏 + 右侧主内容区
- **卡片设计**：圆角、阴影、悬停效果
- **图表样式**：渐变线条、平滑动画

### 主要组件

1. **Navbar**：顶部导航栏，渐变背景
2. **ConfigForm**：左侧配置表单
3. **StatsCard**：统计卡片（总体统计 + 机器人统计）
4. **PointsChart**：图表组件，支持多种维度和类型

### 响应式设计

- 桌面端：双列布局（配置栏 400px + 主内容区）
- 移动端：单列堆叠布局

## 🔄 数据流

```
用户输入配置
    ↓
前端发送请求到后端
    ↓
后端调用 Poe API
    ↓
检查数据库是否存在
    ↓
存储新数据 / 停止（遇到重复）
    ↓
返回拉取结果
    ↓
前端刷新图表和统计
```

## 🎯 核心功能实现

### 1. 自动分页拉取

```go
for !duplicateFound {
    // 构建请求
    requestBody := buildRequest(cursor)
    
    // 调用 API
    response := callPoeAPI(requestBody)
    
    // 检查重复
    for _, record := range response.Records {
        if exists(record.ID) {
            duplicateFound = true
            break
        }
        save(record)
    }
    
    // 更新游标
    cursor = response.EndCursor
    
    // 延迟 1 秒
    sleep(1 * time.Second)
}
```

### 2. 时间粒度聚合

使用 SQLite 的 `strftime` 函数按不同粒度分组：

- **分钟**：`strftime('%Y-%m-%d %H:%M', ...)`
- **小时**：`strftime('%Y-%m-%d %H:00', ...)`
- **半天**：根据小时判断上午/下午
- **全天**：`strftime('%Y-%m-%d', ...)`

### 3. 累积计算

使用窗口函数 `SUM() OVER (ORDER BY time_group)` 计算累积值。

## 🚀 部署

### 开发环境

```bash
./start.sh
```

### 生产打包

```bash
cd frontend
npm run pack       # macOS ARM64
npm run pack:intel # macOS Intel
```

## 📊 使用场景

1. **个人使用统计**
   - 了解自己在 Poe 上的积分消耗情况
   - 分析使用习惯和高峰时段

2. **成本控制**
   - 监控积分消耗速度
   - 预测未来消耗趋势

3. **机器人对比**
   - 查看各个机器人的使用频率
   - 优化机器人选择策略

## 🔐 安全性

- Cookie 等敏感信息仅存储在本地
- 数据库存储在用户目录下
- 不上传任何数据到第三方服务器

## 📈 未来扩展

可能的功能扩展：

1. **数据导出**：导出为 CSV/Excel
2. **提醒功能**：积分低于阈值时提醒
3. **多账户支持**：同时监控多个 Poe 账户
4. **定时拉取**：设置定时任务自动拉取
5. **更多图表**：饼图、柱状图等

## 🙏 致谢

- UI 设计参考 `scoreRecord` 项目
- 图表库使用 Recharts
- 后端框架使用 Gin

---

**开发完成时间**：2025-12-01
**版本**：v1.0.0

