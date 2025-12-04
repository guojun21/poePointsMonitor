package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB
var appDataDir string
var autoFetchTicker *time.Ticker
var autoFetchStop chan bool
var isAutoFetching bool
var lastAutoFetchTime time.Time
var lastAutoFetchResult string
var frontendLogFile *os.File

// 数据库模型
type PointsHistoryNode struct {
	ID           string    `json:"id"`
	PointCost    int       `json:"point_cost"`
	CreationTime int64     `json:"creation_time"`
	BotName      string    `json:"bot_name"`
	BotID        string    `json:"bot_id"`
	Cursor       string    `json:"cursor"`
	CreatedAt    time.Time `json:"created_at"`
}

// Poe API 响应结构
type PoeResponse struct {
	Data struct {
		Viewer struct {
			PointsHistoryConnection struct {
				Edges []struct {
					Node struct {
						ID           string `json:"id"`
						PointCost    int    `json:"pointCost"`
						CreationTime int64  `json:"creationTime"`
						Bot          struct {
							DisplayName string `json:"displayName"`
							ID          string `json:"id"`
						} `json:"bot"`
					} `json:"node"`
					Cursor string `json:"cursor"`
				} `json:"edges"`
				PageInfo struct {
					EndCursor   string `json:"endCursor"`
					HasNextPage bool   `json:"hasNextPage"`
				} `json:"pageInfo"`
			} `json:"pointsHistoryConnection"`
		} `json:"viewer"`
	} `json:"data"`
}

// 统计数据结构
type AggregatedStats struct {
	Timestamp   string `json:"timestamp"`
	PointCost   int    `json:"point_cost"`
	RecordCount int    `json:"record_count"`
}

// 配置信息
type Config struct {
	ID                 int       `json:"id"`
	Cookie             string    `json:"cookie"`
	FormKey            string    `json:"form_key"`
	TChannel           string    `json:"tchannel"`
	Revision           string    `json:"revision"`
	TagID              string    `json:"tag_id"`
	SubscriptionDay    int       `json:"subscription_day"`    // 每月订阅日（1-31）
	AutoFetchInterval  int       `json:"auto_fetch_interval"` // 自动拉取间隔（分钟）
	AutoFetchEnabled   bool      `json:"auto_fetch_enabled"`  // 是否启用自动拉取
	UpdatedAt          time.Time `json:"updated_at"`
}

// CORS Middleware
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// 初始化数据库
func initDB() {
	var err error

	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatal(err)
	}

	appDataDir = filepath.Join(homeDir, "Library", "Application Support", "PoePointsMonitor")
	if err := os.MkdirAll(appDataDir, 0755); err != nil {
		log.Fatal(err)
	}

	dbPath := filepath.Join(appDataDir, "points.db")
	fmt.Printf("Database path: %s\n", dbPath)

	// 创建前端日志文件
	logPath := filepath.Join(appDataDir, "frontend.log")
	var logErr error
	frontendLogFile, logErr = os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if logErr != nil {
		log.Printf("Failed to open frontend log file: %v", logErr)
	} else {
		fmt.Printf("Frontend log path: %s\n", logPath)
	}

	var dbErr error
	db, dbErr = sql.Open("sqlite3", dbPath)
	if dbErr != nil {
		log.Fatal(dbErr)
	}

	createTable := `
	CREATE TABLE IF NOT EXISTS points_history (
		id TEXT PRIMARY KEY,
		point_cost INTEGER NOT NULL,
		creation_time INTEGER NOT NULL,
		bot_name TEXT NOT NULL,
		bot_id TEXT NOT NULL,
		cursor TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_creation_time ON points_history(creation_time);
	CREATE INDEX IF NOT EXISTS idx_created_at ON points_history(created_at);
	
	CREATE TABLE IF NOT EXISTS config (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		cookie TEXT,
		form_key TEXT,
		tchannel TEXT,
		revision TEXT,
		tag_id TEXT,
		subscription_day INTEGER DEFAULT 1,
		auto_fetch_interval INTEGER DEFAULT 30,
		auto_fetch_enabled INTEGER DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE TABLE IF NOT EXISTS layout_config (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sidebar_width INTEGER DEFAULT 400,
		grid_layout TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	if _, err := db.Exec(createTable); err != nil {
		log.Fatal(err)
	}
}

// 检查记录是否存在
func recordExists(id string) (bool, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM points_history WHERE id = ?)", id).Scan(&exists)
	return exists, err
}

// 插入记录
func insertRecord(node *PointsHistoryNode) error {
	_, err := db.Exec(`
		INSERT INTO points_history (id, point_cost, creation_time, bot_name, bot_id, cursor, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, node.ID, node.PointCost, node.CreationTime, node.BotName, node.BotID, node.Cursor, node.CreatedAt)
	return err
}

// 计算指定月份的订阅周期开始和结束时间（微秒时间戳）
func getSubscriptionPeriod(year, month, subscriptionDay int) (int64, int64) {
	// 当前周期开始时间
	periodStart := time.Date(year, time.Month(month), subscriptionDay, 0, 0, 0, 0, time.Local)
	
	// 下个周期开始时间（下个月的同一天）
	nextMonth := month + 1
	nextYear := year
	if nextMonth > 12 {
		nextMonth = 1
		nextYear++
	}
	periodEnd := time.Date(nextYear, time.Month(nextMonth), subscriptionDay, 0, 0, 0, 0, time.Local)
	
	return periodStart.UnixMicro(), periodEnd.UnixMicro()
}

// 计算指定时间戳所在的订阅周期
func getCurrentSubscriptionPeriod(subscriptionDay int, timestamp int64) (int64, int64) {
	t := time.Unix(timestamp/1000000, 0)
	year := t.Year()
	month := int(t.Month())
	day := t.Day()
	
	// 如果当前日期小于订阅日，说明还在上个月的周期内
	if day < subscriptionDay {
		month--
		if month < 1 {
			month = 12
			year--
		}
	}
	
	return getSubscriptionPeriod(year, month, subscriptionDay)
}

// 获取统计数据
func getStats(c *gin.Context) {
	granularity := c.Query("granularity") // minute, hour, halfday, day
	chartType := c.Query("type")          // discrete, cumulative
	periodOffset := c.Query("period")     // 周期偏移量（0=当前月，-1=上个月，1=下个月）

	if granularity == "" {
		granularity = "hour"
	}
	if chartType == "" {
		chartType = "discrete"
	}
	
	offset := 0
	if periodOffset != "" {
		fmt.Sscanf(periodOffset, "%d", &offset)
	}

	// 获取订阅日配置
	var subscriptionDay int
	err := db.QueryRow("SELECT COALESCE(subscription_day, 1) FROM config ORDER BY id DESC LIMIT 1").Scan(&subscriptionDay)
	if err != nil {
		subscriptionDay = 1
	}

	// 计算查询的时间范围
	now := time.Now()
	targetMonth := int(now.Month()) + offset
	targetYear := now.Year()
	
	for targetMonth < 1 {
		targetMonth += 12
		targetYear--
	}
	for targetMonth > 12 {
		targetMonth -= 12
		targetYear++
	}
	
	periodStart, periodEnd := getSubscriptionPeriod(targetYear, targetMonth, subscriptionDay)
	
	// 如果是当前月且当前日期小于订阅日，应该用上个月的周期
	if offset == 0 && now.Day() < subscriptionDay {
		targetMonth--
		if targetMonth < 1 {
			targetMonth = 12
			targetYear--
		}
		periodStart, periodEnd = getSubscriptionPeriod(targetYear, targetMonth, subscriptionDay)
	}

	var groupBy string

	switch granularity {
	case "minute":
		groupBy = "strftime('%Y-%m-%d %H:%M', datetime(creation_time / 1000000, 'unixepoch', 'localtime'))"
	case "hour":
		groupBy = "strftime('%Y-%m-%d %H:00', datetime(creation_time / 1000000, 'unixepoch', 'localtime'))"
	case "halfday":
		// 半天：将一天分为上午(00:00-11:59)和下午(12:00-23:59)
		groupBy = `
			strftime('%Y-%m-%d', datetime(creation_time / 1000000, 'unixepoch', 'localtime')) || 
			CASE 
				WHEN CAST(strftime('%H', datetime(creation_time / 1000000, 'unixepoch', 'localtime')) AS INTEGER) < 12 
				THEN ' 上午' 
				ELSE ' 下午' 
			END
		`
	case "day":
		groupBy = "strftime('%Y-%m-%d', datetime(creation_time / 1000000, 'unixepoch', 'localtime'))"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid granularity"})
		return
	}

	var query string
	if chartType == "cumulative" {
		// 累积图表：计算累积总和
		query = fmt.Sprintf(`
			WITH time_groups AS (
				SELECT 
					%s as time_group,
					SUM(point_cost) as point_cost,
					COUNT(*) as record_count
				FROM points_history
				WHERE creation_time >= ? AND creation_time < ?
				GROUP BY time_group
				ORDER BY time_group
			)
			SELECT 
				time_group,
				SUM(point_cost) OVER (ORDER BY time_group) as cumulative_cost,
				SUM(record_count) OVER (ORDER BY time_group) as cumulative_count
			FROM time_groups
		`, groupBy)
	} else {
		// 分立图表：每个时间段的独立数据
		query = fmt.Sprintf(`
			SELECT 
				%s as time_group,
				SUM(point_cost) as point_cost,
				COUNT(*) as record_count
			FROM points_history
			WHERE creation_time >= ? AND creation_time < ?
			GROUP BY time_group
			ORDER BY time_group
		`, groupBy)
	}

	rows, err := db.Query(query, periodStart, periodEnd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var stats []AggregatedStats
	for rows.Next() {
		var s AggregatedStats
		if err := rows.Scan(&s.Timestamp, &s.PointCost, &s.RecordCount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		stats = append(stats, s)
	}

	if stats == nil {
		stats = []AggregatedStats{}
	}

	// 格式化周期标签
	startTime := time.Unix(periodStart/1000000, 0)
	endTime := time.Unix(periodEnd/1000000, 0)
	
	periodLabelStr := fmt.Sprintf("%02d.%02d - %02d.%02d", 
		startTime.Month(), startTime.Day(),
		endTime.Month(), endTime.Day())

	c.JSON(http.StatusOK, gin.H{
		"data":         stats,
		"period_start": periodStart,
		"period_end":   periodEnd,
		"period_label": periodLabelStr,
	})
}

// 手动触发数据拉取
func fetchPointsHistory(c *gin.Context) {
	var input struct {
		Cookie          string `json:"cookie" binding:"required"`
		FormKey         string `json:"form_key" binding:"required"`
		TChannel        string `json:"tchannel" binding:"required"`
		Revision        string `json:"revision"`
		TagID           string `json:"tag_id"`
		SubscriptionDay int    `json:"subscription_day"` // 每月订阅日（1-31）
		FullSync        bool   `json:"full_sync"`        // 是否全量拉取（覆盖已有数据）
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置默认值
	if input.Revision == "" {
		input.Revision = "59988163982a4ac4be7c7e7784f006dc48cafcf5"
	}
	if input.TagID == "" {
		input.TagID = "8a0df086c2034f5e97dcb01c426029ee"
	}
	if input.SubscriptionDay <= 0 || input.SubscriptionDay > 31 {
		input.SubscriptionDay = 1
	}

	// 计算当前订阅周期的开始时间（用于全量拉取时的截止时间）
	now := time.Now()
	currentDay := now.Day()
	year := now.Year()
	month := int(now.Month())
	
	// 如果当前日期小于订阅日，使用上个月
	if currentDay < input.SubscriptionDay {
		month--
		if month < 1 {
			month = 12
			year--
		}
	}
	
	subscriptionStartTime := time.Date(year, time.Month(month), input.SubscriptionDay, 0, 0, 0, 0, time.Local)
	subscriptionStartMicros := subscriptionStartTime.UnixMicro()

	// 保存配置到数据库
	// 获取当前的自动拉取设置，以免被覆盖
	var autoFetchInterval, autoFetchEnabled int
	db.QueryRow("SELECT COALESCE(auto_fetch_interval, 30), COALESCE(auto_fetch_enabled, 0) FROM config ORDER BY id DESC LIMIT 1").Scan(&autoFetchInterval, &autoFetchEnabled)
	
	if err := upsertConfig(input.Cookie, input.FormKey, input.TChannel, input.Revision, input.TagID, 
		input.SubscriptionDay, autoFetchInterval, autoFetchEnabled); err != nil {
		log.Printf("Failed to save config during fetch: %v", err)
	}

	newRecords := 0
	updatedRecords := 0
	duplicateFound := false
	reachedSubscriptionStart := false
	cursor := ""

	for !duplicateFound && !reachedSubscriptionStart {
		// 构建请求体 - 使用新的 API
		requestBody := map[string]interface{}{
			"queryName": "PointsHistoryPageColumnViewerPaginationQuery",
			"variables": map[string]interface{}{
				"limit": 20,
			},
			"extensions": map[string]string{
				"hash": "9b68fe8ea0017e5d7701c93a5db8323136f9cb023d514f8595ae0dde220be6d1",
			},
		}

		// 如果有 cursor，添加到 variables
		if cursor != "" {
			requestBody["variables"].(map[string]interface{})["cursor"] = cursor
		}

		jsonBody, _ := json.Marshal(requestBody)

		// 创建 HTTP 请求
		req, err := http.NewRequest("POST", "https://poe.com/api/gql_POST", strings.NewReader(string(jsonBody)))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 设置请求头
		req.Header.Set("accept", "*/*")
		req.Header.Set("accept-language", "zh-CN,zh;q=0.9,en;q=0.8")
		req.Header.Set("content-type", "application/json")
		req.Header.Set("cookie", input.Cookie)
		req.Header.Set("origin", "https://poe.com")
		req.Header.Set("poe-formkey", input.FormKey)
		req.Header.Set("poe-queryname", "PointsHistoryPageColumnViewerPaginationQuery")
		req.Header.Set("poe-revision", input.Revision)
		req.Header.Set("poe-tag-id", input.TagID)
		req.Header.Set("poe-tchannel", input.TChannel)
		req.Header.Set("poegraphql", "1")
		req.Header.Set("referer", "https://poe.com/points_history")
		req.Header.Set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36")

		// 发送请求
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 解析响应
		var poeResp PoeResponse
		if err := json.Unmarshal(body, &poeResp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response", "details": err.Error()})
			return
		}

		// 处理每条记录
		for _, edge := range poeResp.Data.Viewer.PointsHistoryConnection.Edges {
			// 检查是否达到本订阅周期的开始时间
			if edge.Node.CreationTime <= subscriptionStartMicros {
				reachedSubscriptionStart = true
				log.Printf("Reached subscription start time: %s", subscriptionStartTime.Format("2006-01-02 15:04:05"))
				break
			}

			// 检查是否已存在
			exists, err := recordExists(edge.Node.ID)
			if err != nil {
				log.Printf("Error checking record: %v", err)
				continue
			}

			// 如果不是全量拉取模式，遇到重复就停止
			if exists && !input.FullSync {
				duplicateFound = true
				break
			}

			// 插入或更新记录
			node := &PointsHistoryNode{
				ID:           edge.Node.ID,
				PointCost:    edge.Node.PointCost,
				CreationTime: edge.Node.CreationTime,
				BotName:      edge.Node.Bot.DisplayName,
				BotID:        edge.Node.Bot.ID,
				Cursor:       edge.Cursor,
				CreatedAt:    time.Unix(edge.Node.CreationTime/1000000, 0),
			}

			if exists {
				// 更新现有记录
				_, err := db.Exec(`
					UPDATE points_history 
					SET point_cost = ?, creation_time = ?, bot_name = ?, bot_id = ?, cursor = ?, created_at = ?
					WHERE id = ?
				`, node.PointCost, node.CreationTime, node.BotName, node.BotID, node.Cursor, node.CreatedAt, node.ID)
				if err != nil {
					log.Printf("Error updating record: %v", err)
					continue
				}
				updatedRecords++
			} else {
				// 插入新记录
				if err := insertRecord(node); err != nil {
					log.Printf("Error inserting record: %v", err)
					continue
				}
				newRecords++
			}
		}

		// 检查是否有下一页
		if !poeResp.Data.Viewer.PointsHistoryConnection.PageInfo.HasNextPage || duplicateFound {
			break
		}

		// 更新 cursor
		cursor = poeResp.Data.Viewer.PointsHistoryConnection.PageInfo.EndCursor

		// 添加延迟，避免请求过快
		time.Sleep(1 * time.Second)
	}

	message := fmt.Sprintf("Successfully fetched %d new records", newRecords)
	if updatedRecords > 0 {
		message = fmt.Sprintf("Successfully fetched %d new records, updated %d existing records", newRecords, updatedRecords)
	}

	c.JSON(http.StatusOK, gin.H{
		"new_records":     newRecords,
		"updated_records": updatedRecords,
		"message":         message,
	})
}

// 获取最新记录
func getLatestRecords(c *gin.Context) {
	limit := c.DefaultQuery("limit", "20")

	rows, err := db.Query(`
		SELECT id, point_cost, creation_time, bot_name, bot_id, cursor, created_at
		FROM points_history
		ORDER BY creation_time DESC
		LIMIT ?
	`, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var records []PointsHistoryNode
	for rows.Next() {
		var r PointsHistoryNode
		if err := rows.Scan(&r.ID, &r.PointCost, &r.CreationTime, &r.BotName, &r.BotID, &r.Cursor, &r.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		records = append(records, r)
	}

	if records == nil {
		records = []PointsHistoryNode{}
	}

	c.JSON(http.StatusOK, records)
}

// 获取用户积分信息
func getUserPointsInfo(c *gin.Context) {
	// 从数据库获取配置
	var config Config
	err := db.QueryRow(`
		SELECT COALESCE(cookie, '') as cookie, COALESCE(form_key, '') as form_key, 
		       COALESCE(tchannel, '') as tchannel, COALESCE(revision, '') as revision, 
		       COALESCE(tag_id, '') as tag_id
		FROM config ORDER BY id DESC LIMIT 1
	`).Scan(&config.Cookie, &config.FormKey, &config.TChannel, &config.Revision, &config.TagID)

	if err != nil || config.Cookie == "" {
		c.JSON(http.StatusOK, gin.H{"error": "No config found"})
		return
	}

	// 构建请求体
	requestBody := map[string]interface{}{
		"queryName": "settingsPageQuery",
		"variables": map[string]interface{}{},
		"extensions": map[string]string{
			"hash": "39ca34ece084fd810ccc8394942a2a584651433a57e7455ae80546a2e7893b5f",
		},
	}

	jsonBody, _ := json.Marshal(requestBody)
	req, err := http.NewRequest("POST", "https://poe.com/api/gql_POST", strings.NewReader(string(jsonBody)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 设置请求头
	req.Header.Set("accept", "*/*")
	req.Header.Set("content-type", "application/json")
	req.Header.Set("cookie", config.Cookie)
	req.Header.Set("poe-formkey", config.FormKey)
	req.Header.Set("poe-tchannel", config.TChannel)
	req.Header.Set("poe-revision", config.Revision)
	req.Header.Set("poe-tag-id", config.TagID)
	req.Header.Set("poe-queryname", "settingsPageQuery")
	req.Header.Set("poegraphql", "1")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 提取积分信息
	data := result["data"].(map[string]interface{})
	viewer := data["viewer"].(map[string]interface{})
	messagePointInfo := viewer["messagePointInfo"].(map[string]interface{})
	subscription := viewer["subscription"].(map[string]interface{})

	// 计算已使用积分
	totalAllotment := int64(messagePointInfo["totalMessagePointAllotment"].(float64))
	currentBalance := int64(messagePointInfo["subscriptionPointBalance"].(float64))
	usedPoints := totalAllotment - currentBalance

	// 获取当前周期的开始时间（通过下次重置时间推算）
	nextGrantTime := int64(messagePointInfo["computePointNextGrantTime"].(float64))
	expiresTime := int64(subscription["expiresTime"].(float64))
	
	// 计算当前周期开始时间（假设是一个月前）
	currentTime := time.Now().UnixMicro()
	cycleStartTime := nextGrantTime - 30*24*60*60*1000000 // 30天前

	// 从数据库获取本周期内的总消耗
	var totalUsedInCycle int
	db.QueryRow(`
		SELECT COALESCE(SUM(point_cost), 0) 
		FROM points_history 
		WHERE creation_time >= ?
	`, cycleStartTime).Scan(&totalUsedInCycle)

	// 计算每日平均消耗
	daysInCycle := float64(currentTime-cycleStartTime) / (24 * 60 * 60 * 1000000)
	if daysInCycle < 1 {
		daysInCycle = 1
	}
	avgPerDay := int(float64(totalUsedInCycle) / daysInCycle)

	// 预计剩余天数
	var remainingDays int
	if avgPerDay > 0 {
		remainingDays = int(float64(currentBalance) / float64(avgPerDay))
	} else {
		remainingDays = 999
	}

	c.JSON(http.StatusOK, gin.H{
		"total_allotment":     totalAllotment,
		"current_balance":     currentBalance,
		"used_points":         usedPoints,
		"usage_percentage":    float64(usedPoints) / float64(totalAllotment) * 100,
		"avg_per_day":         avgPerDay,
		"remaining_days":      remainingDays,
		"next_grant_time":     nextGrantTime,
		"expires_time":        expiresTime,
		"subscription_product": subscription["subscriptionProduct"].(map[string]interface{})["displayName"],
	})
}

// 获取机器人统计
func getBotStats(c *gin.Context) {
	rows, err := db.Query(`
		SELECT 
			bot_name,
			SUM(point_cost) as total_cost,
			COUNT(*) as count
		FROM points_history
		GROUP BY bot_name
		ORDER BY total_cost DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type BotStat struct {
		BotName   string `json:"bot_name"`
		TotalCost int    `json:"total_cost"`
		Count     int    `json:"count"`
	}

	var stats []BotStat
	for rows.Next() {
		var s BotStat
		if err := rows.Scan(&s.BotName, &s.TotalCost, &s.Count); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		stats = append(stats, s)
	}

	if stats == nil {
		stats = []BotStat{}
	}

	c.JSON(http.StatusOK, stats)
}

// 获取配置
func getConfig(c *gin.Context) {
	var config Config
	var autoFetchEnabled int
	err := db.QueryRow(`
		SELECT id, COALESCE(cookie, '') as cookie, COALESCE(form_key, '') as form_key, 
		       COALESCE(tchannel, '') as tchannel, COALESCE(revision, '') as revision, 
		       COALESCE(tag_id, '') as tag_id, COALESCE(subscription_day, 1) as subscription_day,
		       COALESCE(auto_fetch_interval, 30) as auto_fetch_interval,
		       COALESCE(auto_fetch_enabled, 0) as auto_fetch_enabled,
		       updated_at
		FROM config ORDER BY id DESC LIMIT 1
	`).Scan(&config.ID, &config.Cookie, &config.FormKey, &config.TChannel, 
		&config.Revision, &config.TagID, &config.SubscriptionDay, 
		&config.AutoFetchInterval, &autoFetchEnabled, &config.UpdatedAt)

	config.AutoFetchEnabled = autoFetchEnabled == 1

	if err == sql.ErrNoRows {
		// 返回空配置
		c.JSON(http.StatusOK, Config{
			Revision:          "59988163982a4ac4be7c7e7784f006dc48cafcf5",
			TagID:             "8a0df086c2034f5e97dcb01c426029ee",
			SubscriptionDay:   1,
			AutoFetchInterval: 30,
			AutoFetchEnabled:  false,
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// 内部辅助函数：保存配置到数据库（处理插入或更新）
func upsertConfig(cookie, formKey, tchannel, revision, tagID string, subscriptionDay, autoFetchInterval, autoFetchEnabled int) error {
	var existingID int
	err := db.QueryRow("SELECT id FROM config ORDER BY id DESC LIMIT 1").Scan(&existingID)

	if err != nil {
		if err == sql.ErrNoRows {
			// 不存在配置，执行插入
			_, err = db.Exec(`
				INSERT INTO config (cookie, form_key, tchannel, revision, tag_id, subscription_day, 
				                    auto_fetch_interval, auto_fetch_enabled, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, cookie, formKey, tchannel, revision, tagID, subscriptionDay, autoFetchInterval, autoFetchEnabled, time.Now())
		}
		// 如果是其他错误，直接返回
		return err
	}

	// 存在配置，执行更新
	_, err = db.Exec(`
		UPDATE config 
		SET cookie = ?, form_key = ?, tchannel = ?, revision = ?, tag_id = ?, 
		    subscription_day = ?, auto_fetch_interval = ?, auto_fetch_enabled = ?, updated_at = ?
		WHERE id = ?
	`, cookie, formKey, tchannel, revision, tagID, subscriptionDay, autoFetchInterval, autoFetchEnabled, time.Now(), existingID)
	
	return err
}

// 保存/更新配置
func saveConfig(c *gin.Context) {
	var input struct {
		Cookie            string `json:"cookie"`
		FormKey           string `json:"form_key"`
		TChannel          string `json:"tchannel"`
		Revision          string `json:"revision"`
		TagID             string `json:"tag_id"`
		SubscriptionDay   int    `json:"subscription_day"`
		AutoFetchInterval int    `json:"auto_fetch_interval"`
		AutoFetchEnabled  bool   `json:"auto_fetch_enabled"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	autoFetchEnabledInt := 0
	if input.AutoFetchEnabled {
		autoFetchEnabledInt = 1
	}

	// 使用统一的保存逻辑
	if err := upsertConfig(input.Cookie, input.FormKey, input.TChannel, input.Revision, input.TagID, 
		input.SubscriptionDay, input.AutoFetchInterval, autoFetchEnabledInt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 重启自动拉取定时器
	restartAutoFetchTimer()

	c.JSON(http.StatusOK, gin.H{"message": "配置已保存"})
}

// 获取布局配置
func getLayoutConfig(c *gin.Context) {
	var sidebarWidth int
	var gridLayout sql.NullString
	
	err := db.QueryRow("SELECT COALESCE(sidebar_width, 400), grid_layout FROM layout_config ORDER BY id DESC LIMIT 1").Scan(&sidebarWidth, &gridLayout)
	
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{
			"sidebar_width": 400,
			"grid_layout":   nil,
		})
		return
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	var layout interface{}
	if gridLayout.Valid && gridLayout.String != "" {
		json.Unmarshal([]byte(gridLayout.String), &layout)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"sidebar_width": sidebarWidth,
		"grid_layout":   layout,
	})
}

// 保存布局配置
func saveLayoutConfig(c *gin.Context) {
	var input struct {
		SidebarWidth *int        `json:"sidebar_width"`
		GridLayout   interface{} `json:"grid_layout"`
	}
	
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// 获取现有配置
	var currentWidth int
	var currentLayout sql.NullString
	db.QueryRow("SELECT COALESCE(sidebar_width, 400), grid_layout FROM layout_config ORDER BY id DESC LIMIT 1").Scan(&currentWidth, &currentLayout)
	
	newWidth := currentWidth
	if input.SidebarWidth != nil {
		newWidth = *input.SidebarWidth
		// 限制宽度范围
		if newWidth < 300 { newWidth = 300 }
		if newWidth > 600 { newWidth = 600 }
	}
	
	newLayout := currentLayout.String
	if input.GridLayout != nil {
		layoutBytes, _ := json.Marshal(input.GridLayout)
		newLayout = string(layoutBytes)
	}
	
	_, err := db.Exec("INSERT OR REPLACE INTO layout_config (id, sidebar_width, grid_layout, updated_at) VALUES (1, ?, ?, ?)", 
		newWidth, newLayout, time.Now())
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "布局已保存"})
}

// 接收前端日志
func logFrontend(c *gin.Context) {
	var logEntry struct {
		Timestamp string      `json:"timestamp"`
		Level     string      `json:"level"`
		Message   string      `json:"message"`
		Data      interface{} `json:"data"`
	}

	if err := c.ShouldBindJSON(&logEntry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 写入日志文件
	if frontendLogFile != nil {
		logLine := fmt.Sprintf("[%s] [%s] %s", logEntry.Timestamp, logEntry.Level, logEntry.Message)
		if logEntry.Data != nil {
			dataJSON, _ := json.Marshal(logEntry.Data)
			logLine += fmt.Sprintf(" | Data: %s", string(dataJSON))
		}
		logLine += "\n"
		
		frontendLogFile.WriteString(logLine)
		frontendLogFile.Sync() // 立即刷新到磁盘
	}

	c.JSON(http.StatusOK, gin.H{"status": "logged"})
}

// 获取自动拉取状态
func getAutoFetchStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"is_running":       isAutoFetching,
		"last_fetch_time":  lastAutoFetchTime,
		"last_fetch_result": lastAutoFetchResult,
	})
}

// 执行自动增量拉取
func performAutoFetch() {
	if isAutoFetching {
		log.Println("Auto fetch already in progress, skipping...")
		return
	}

	isAutoFetching = true
	defer func() { isAutoFetching = false }()

	log.Println("Starting auto fetch...")
	lastAutoFetchTime = time.Now()

	// 从数据库获取配置
	var config Config
	var autoFetchEnabled int
	err := db.QueryRow(`
		SELECT COALESCE(cookie, '') as cookie, COALESCE(form_key, '') as form_key, 
		       COALESCE(tchannel, '') as tchannel, COALESCE(revision, '') as revision, 
		       COALESCE(tag_id, '') as tag_id, COALESCE(subscription_day, 1) as subscription_day,
		       COALESCE(auto_fetch_enabled, 0) as auto_fetch_enabled
		FROM config ORDER BY id DESC LIMIT 1
	`).Scan(&config.Cookie, &config.FormKey, &config.TChannel, 
		&config.Revision, &config.TagID, &config.SubscriptionDay, &autoFetchEnabled)

	if err != nil || autoFetchEnabled == 0 {
		lastAutoFetchResult = "Disabled or no config"
		log.Println("Auto fetch disabled or no config")
		return
	}

	if config.Cookie == "" || config.FormKey == "" || config.TChannel == "" {
		lastAutoFetchResult = "Invalid config"
		log.Println("Auto fetch: invalid config")
		return
	}

	// 计算当前订阅周期的开始时间
	now := time.Now()
	currentDay := now.Day()
	year := now.Year()
	month := int(now.Month())
	
	if currentDay < config.SubscriptionDay {
		month--
		if month < 1 {
			month = 12
			year--
		}
	}
	
	subscriptionStartTime := time.Date(year, time.Month(month), config.SubscriptionDay, 0, 0, 0, 0, time.Local)
	subscriptionStartMicros := subscriptionStartTime.UnixMicro()

	// 执行增量拉取
	newRecords := 0
	cursor := ""
	reachedSubscriptionStart := false

	for i := 0; i < 10; i++ { // 最多拉取 10 页，避免无限循环
		requestBody := map[string]interface{}{
			"queryName": "PointsHistoryPageColumnViewerPaginationQuery",
			"variables": map[string]interface{}{
				"limit": 20,
			},
			"extensions": map[string]string{
				"hash": "9b68fe8ea0017e5d7701c93a5db8323136f9cb023d514f8595ae0dde220be6d1",
			},
		}

		if cursor != "" {
			requestBody["variables"].(map[string]interface{})["cursor"] = cursor
		}

		jsonBody, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest("POST", "https://poe.com/api/gql_POST", strings.NewReader(string(jsonBody)))
		
		req.Header.Set("accept", "*/*")
		req.Header.Set("content-type", "application/json")
		req.Header.Set("cookie", config.Cookie)
		req.Header.Set("poe-formkey", config.FormKey)
		req.Header.Set("poe-tchannel", config.TChannel)
		req.Header.Set("poe-revision", config.Revision)
		req.Header.Set("poe-tag-id", config.TagID)
		req.Header.Set("poe-queryname", "PointsHistoryPageColumnViewerPaginationQuery")
		req.Header.Set("poegraphql", "1")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			lastAutoFetchResult = fmt.Sprintf("Error: %v", err)
			log.Printf("Auto fetch error: %v", err)
			return
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var poeResp PoeResponse
		if err := json.Unmarshal(body, &poeResp); err != nil {
			lastAutoFetchResult = fmt.Sprintf("Parse error: %v", err)
			log.Printf("Auto fetch parse error: %v", err)
			return
		}

		foundDuplicate := false
		for _, edge := range poeResp.Data.Viewer.PointsHistoryConnection.Edges {
			if edge.Node.CreationTime <= subscriptionStartMicros {
				reachedSubscriptionStart = true
				break
			}

			exists, _ := recordExists(edge.Node.ID)
			if exists {
				foundDuplicate = true
				break
			}

			node := &PointsHistoryNode{
				ID:           edge.Node.ID,
				PointCost:    edge.Node.PointCost,
				CreationTime: edge.Node.CreationTime,
				BotName:      edge.Node.Bot.DisplayName,
				BotID:        edge.Node.Bot.ID,
				Cursor:       edge.Cursor,
				CreatedAt:    time.Unix(edge.Node.CreationTime/1000000, 0),
			}

			if insertRecord(node) == nil {
				newRecords++
			}
		}

		if foundDuplicate || reachedSubscriptionStart || !poeResp.Data.Viewer.PointsHistoryConnection.PageInfo.HasNextPage {
			break
		}

		cursor = poeResp.Data.Viewer.PointsHistoryConnection.PageInfo.EndCursor
		time.Sleep(1 * time.Second)
	}

	lastAutoFetchResult = fmt.Sprintf("Success: %d new records", newRecords)
	log.Printf("Auto fetch completed: %d new records", newRecords)
}

// 启动自动拉取定时器
func startAutoFetchTimer(interval int) {
	if autoFetchTicker != nil {
		autoFetchTicker.Stop()
	}

	if interval <= 0 {
		interval = 30 // 默认 30 分钟
	}

	autoFetchTicker = time.NewTicker(time.Duration(interval) * time.Minute)
	autoFetchStop = make(chan bool)

	go func() {
		for {
			select {
			case <-autoFetchTicker.C:
				performAutoFetch()
			case <-autoFetchStop:
				return
			}
		}
	}()

	log.Printf("Auto fetch timer started with %d minutes interval", interval)
}

// 停止自动拉取定时器
func stopAutoFetchTimer() {
	if autoFetchTicker != nil {
		autoFetchTicker.Stop()
		if autoFetchStop != nil {
			close(autoFetchStop)
		}
		log.Println("Auto fetch timer stopped")
	}
}

// 重启自动拉取定时器
func restartAutoFetchTimer() {
	if db == nil {
		log.Println("Database not initialized, skipping auto fetch timer restart")
		return
	}

	var autoFetchInterval int
	var autoFetchEnabled int

	err := db.QueryRow(`
		SELECT COALESCE(auto_fetch_interval, 30), COALESCE(auto_fetch_enabled, 0)
		FROM config ORDER BY id DESC LIMIT 1
	`).Scan(&autoFetchInterval, &autoFetchEnabled)

	if err == nil && autoFetchEnabled == 1 {
		startAutoFetchTimer(autoFetchInterval)
	} else {
		stopAutoFetchTimer()
	}
}

func main() {
	port := flag.String("port", "58232", "Port to run the server on")
	flag.Parse()

	initDB()
	defer func() {
		if db != nil {
			db.Close()
		}
		if frontendLogFile != nil {
			frontendLogFile.Close()
		}
	}()

	r := gin.Default()
	r.Use(CORSMiddleware())

	api := r.Group("/api")
	{
		api.POST("/fetch", fetchPointsHistory)
		api.GET("/stats", getStats)
		api.GET("/records", getLatestRecords)
		api.GET("/bot-stats", getBotStats)
		api.GET("/config", getConfig)
		api.POST("/config", saveConfig)
		api.GET("/auto-fetch-status", getAutoFetchStatus)
		api.GET("/user-points-info", getUserPointsInfo)
		api.GET("/layout", getLayoutConfig)
		api.POST("/layout", saveLayoutConfig)
		api.POST("/log", logFrontend)
	}

	// 启动自动拉取定时器
	restartAutoFetchTimer()

	fmt.Printf("Server starting on port %s...\n", *port)
	if err := r.Run(":" + *port); err != nil {
		log.Fatal(err)
	}
}

