/**
 * Poe 数据适配器
 * 将 Poe API 返回的数据转换为表格所需的格式
 */

/**
 * 将 Poe points history 数据转换为表格行数据
 * @param {Array} pointsHistory - 原始积分历史数据
 * @returns {Array} 表格行数据
 */
export function convertToTableData(pointsHistory) {
  if (!pointsHistory || !Array.isArray(pointsHistory)) {
    return []
  }

  return pointsHistory.map((item, index) => {
    // 转换时间戳（微秒 → 毫秒）
    const creationTime = item.creation_time 
      ? new Date(Math.floor(item.creation_time / 1000))
      : null

    return {
      '序号': index + 1,
      'ID': item.id || '-',
      '模型名称': item.bot_name || 'Unknown',
      '模型 ID': item.bot_id || '-',
      '消耗积分': item.point_cost || 0,
      '创建时间': creationTime ? creationTime.toISOString() : '-',
      '时间戳': item.creation_time || 0,
      '日期': creationTime ? creationTime.toLocaleDateString('zh-CN') : '-',
      '时间': creationTime ? creationTime.toLocaleTimeString('zh-CN') : '-',
    }
  })
}

/**
 * 获取表格列配置
 * @returns {Array} 列名数组
 */
export function getTableColumns() {
  return [
    '序号',
    'ID',
    '模型名称',
    '模型 ID',
    '消耗积分',
    '创建时间',
    '日期',
    '时间'
  ]
}

/**
 * 按日期范围过滤数据
 * @param {Array} data - 表格数据
 * @param {Object} dateRange - 日期范围 { start: Date, end: Date }
 * @returns {Array} 过滤后的数据
 */
export function filterByDateRange(data, dateRange) {
  if (!dateRange || (!dateRange.start && !dateRange.end)) {
    return data
  }

  return data.filter(row => {
    const timestamp = row['时间戳']
    if (!timestamp) return false

    const date = new Date(Math.floor(timestamp / 1000))
    
    if (dateRange.start && date < dateRange.start) return false
    if (dateRange.end) {
      // 包含结束日期当天
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      if (date > endDate) return false
    }
    
    return true
  })
}

/**
 * 数据排序
 * @param {Array} data - 表格数据
 * @param {string} key - 排序列
 * @param {string} direction - 排序方向 'asc' | 'desc'
 * @returns {Array} 排序后的数据
 */
export function sortData(data, key, direction) {
  if (!data || !key) return data

  return [...data].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    // 处理空值
    if (aVal === null || aVal === undefined || aVal === '-') return 1
    if (bVal === null || bVal === undefined || bVal === '-') return -1

    // 数字比较
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    // 字符串比较
    const aStr = String(aVal)
    const bStr = String(bVal)
    
    if (direction === 'asc') {
      return aStr.localeCompare(bStr)
    } else {
      return bStr.localeCompare(aStr)
    }
  })
}

/**
 * 计算统计信息
 * @param {Array} data - 表格数据
 * @returns {Object} 统计信息
 */
export function calculateStatistics(data) {
  if (!data || data.length === 0) {
    return {
      totalCost: 0,
      totalRecords: 0,
      avgCost: 0,
      maxCost: 0,
      minCost: 0,
      modelDistribution: []
    }
  }

  let totalCost = 0
  let maxCost = 0
  let minCost = Infinity
  const modelStats = {}

  data.forEach(row => {
    const cost = row['消耗积分'] || 0
    const model = row['模型名称'] || 'Unknown'

    totalCost += cost
    maxCost = Math.max(maxCost, cost)
    minCost = Math.min(minCost, cost)

    if (!modelStats[model]) {
      modelStats[model] = { count: 0, totalCost: 0 }
    }
    modelStats[model].count++
    modelStats[model].totalCost += cost
  })

  // 转换模型统计为数组并排序
  const modelDistribution = Object.entries(modelStats)
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      cost: stats.totalCost,
      avgCost: stats.totalCost / stats.count,
      percentage: (stats.count / data.length) * 100
    }))
    .sort((a, b) => b.cost - a.cost)

  return {
    totalCost,
    totalRecords: data.length,
    avgCost: totalCost / data.length,
    maxCost,
    minCost: minCost === Infinity ? 0 : minCost,
    modelDistribution
  }
}
