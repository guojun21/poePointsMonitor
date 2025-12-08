# Go 版本配置说明

## 问题背景

本项目使用 **Go 1.25.4**，而系统中其他项目使用 **Go 1.21.13**。

之前遇到的编译错误是因为：
- 系统 PATH 中的 `go` 命令是 1.21.13 版本
- 但它的 GOROOT 指向 `/usr/local/go`，里面是 1.25.4 的标准库
- 导致编译器版本和标准库版本不匹配

## 解决方案

### 方案：项目级别指定 Go 版本

我们为这个项目单独配置了 Go 1.25.4：

1. **`go.mod` 中指定版本**：
   ```go
   go 1.25
   ```

2. **启动脚本自动配置环境**：
   `start.sh` 中添加了：
   ```bash
   export PATH="/usr/local/go/bin:$PATH"
   export GOROOT="/usr/local/go"
   ```

3. **编译脚本**：
   创建了 `backend/build.sh` 用于独立编译

## 使用方法

### 正常启动（推荐）

```bash
./start.sh
```

启动脚本会自动：
- 配置 Go 1.25 环境
- 检查是否需要重新编译
- 启动前后端服务

### 手动编译

```bash
cd backend
./build.sh
```

或者：

```bash
cd backend
PATH="/usr/local/go/bin:$PATH" GOROOT="/usr/local/go" go build -o poe-backend main.go
```

### 手动运行

```bash
cd backend
./poe-backend -port 58232
```

## 验证

检查当前使用的 Go 版本：

```bash
cd backend
PATH="/usr/local/go/bin:$PATH" GOROOT="/usr/local/go" go version
# 应该输出: go version go1.25.4 darwin/amd64
```

## 注意事项

1. **其他项目不受影响**：只有这个项目使用 Go 1.25，其他项目仍然使用系统默认的 Go 1.21
2. **CI/CD 环境**：如果有 CI/CD 流程，需要确保使用 Go 1.25+ 版本
3. **依赖管理**：如果更新依赖，请使用正确的 Go 版本：
   ```bash
   cd backend
   PATH="/usr/local/go/bin:$PATH" GOROOT="/usr/local/go" go mod tidy
   ```

## 为什么选择 Go 1.25？

- Go 1.25 是最新稳定版本，包含性能改进和新特性
- 项目代码已经兼容 1.25
- 标准库（`/usr/local/go`）已经是 1.25.4 版本

## BUG 修复记录

### 半天时间粒度显示问题

**问题**：选择"半天"时间粒度时，图表显示"暂无数据"

**原因**：后端返回的时间戳格式为 `"2025-12-01 上午"` 或 `"2025-12-01 下午"`，前端无法解析带有中文的时间格式

**修复**：将后端的半天时间格式改为 `"2025-12-01 00:00"` (上午) 和 `"2025-12-01 12:00"` (下午)

**修改文件**：`backend/main.go` 第 326-335 行

**修复时间**：2025-12-08

---

**最后更新**：2025-12-08
