# 后端更新指南

## 需要添加的 API Endpoint

由于 Go 版本冲突，无法直接编译。已在 `backend/main.go` 中添加了以下代码，需要手动重新编译。

### 1. 添加的新 endpoint

在 `main()` 函数中的路由组添加：

```go
api.GET("/history", getAllHistory)
```

### 2. 添加的新函数

在 `getStats()` 函数之前添加：

```go
// 获取所有历史记录（用于表格展示）
func getAllHistory(c *gin.Context) {
	limit := c.DefaultQuery("limit", "10000") // 默认最多返回 10000 条
	offset := c.DefaultQuery("offset", "0")

	query := `
		SELECT id, point_cost, creation_time, bot_name, bot_id, cursor, created_at
		FROM points_history
		ORDER BY creation_time DESC
		LIMIT ? OFFSET ?
	`

	rows, err := db.Query(query, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var history []PointsHistoryNode
	for rows.Next() {
		var node PointsHistoryNode
		if err := rows.Scan(
			&node.ID,
			&node.PointCost,
			&node.CreationTime,
			&node.BotName,
			&node.BotID,
			&node.Cursor,
			&node.CreatedAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		history = append(history, node)
	}

	c.JSON(http.StatusOK, history)
}
```

## 编译命令

```bash
cd backend
go build -o poe-backend main.go
```

## 已完成的前端改造

1. ✅ 复制了 csv-viewer 的 datepicker、header、data-table、statistics 组件
2. ✅ 将所有组件的 border-radius 改为 0（正方形风格）
3. ✅ 创建了数据适配层 `frontend/src/utils/poeDataAdapter.js`
4. ✅ 创建了表格视图组件 `frontend/src/components/TableView.jsx`
5. ✅ 在 TabBar 中添加了"数据表格"标签页
6. ✅ 在 App.jsx 中集成了 TableView 组件

## 功能说明

### 表格视图特性

- **数据展示**：展示所有历史积分消耗记录
- **排序功能**：点击列头可按该列排序（升序/降序）
- **日期筛选**：使用日期选择器筛选特定时间范围的数据
- **密度调整**：紧凑/默认/舒适三种行高选项
- **统计信息**：顶部显示积分消耗和模型使用的统计卡片
- **正方形风格**：所有元素无圆角，完全紧贴

### 数据列

- 序号
- ID
- 模型名称
- 模型 ID
- 消耗积分
- 创建时间
- 日期
- 时间

## 注意事项

代码已全部修改完成，只需：
1. 重新编译后端（使用正确的 Go 版本）
2. 重启后端服务
3. 刷新前端页面

即可看到新的"数据表格"标签页。
