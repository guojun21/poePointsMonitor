import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import './CostTrendChart.css'

// 解析时间戳（支持多种格式）
const parseTimestamp = (timestamp) => {
  if (!timestamp) return null
  
  try {
    // 尝试直接解析（支持 ISO 格式和标准格式）
    let date = new Date(timestamp)
    if (!isNaN(date.getTime())) return date
    
    // 尝试解析 YYYY/MM/DD HH:mm:ss 格式
    const match = timestamp.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
      const [, year, month, day, hour, minute, second] = match
      date = new Date(year, month - 1, day, hour, minute, second)
      if (!isNaN(date.getTime())) return date
    }
    
    // 尝试解析 YYYY-MM-DD HH:mm:ss 格式
    const match2 = timestamp.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)
    if (match2) {
      const [, year, month, day, hour, minute, second] = match2
      date = new Date(year, month - 1, day, hour, minute, second)
      if (!isNaN(date.getTime())) return date
    }
    
    return null
  } catch (e) {
    return null
  }
}

// 格式化时间显示
const formatTimeLabel = (date, prevDate, granularity) => {
  if (!date) return ''
  
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const dateStr = `${date.getMonth() + 1}.${date.getDate()}`
  
  if (granularity === 'day') {
    return dateStr
  }
  
  if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
    return `${dateStr}\n${timeStr}`
  }
  
  return timeStr
}

const CostTrendChart = ({ data, granularity = 'hour', chartType = 'discrete', onGranularityChange, onChartTypeChange }) => {
  
  // 根据粒度获取时间间隔（毫秒）
  const getGranularityMs = (gran) => {
    switch (gran) {
      case 'minute': return 60 * 1000
      case 'hour': return 60 * 60 * 1000
      case 'halfday': return 12 * 60 * 60 * 1000
      case 'day': return 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000
    }
  }

  // 处理数据：按时间分组，计算每个时间段的成本
  const { processedData, dateSeparators, firstOfDaySet } = useMemo(() => {
    if (!data || data.length === 0) return { processedData: [], dateSeparators: [], firstOfDaySet: new Set() }
    
    const granularityMs = getGranularityMs(granularity)
    const dataMap = new Map()
    
    // 按时间分组并聚合
    data.forEach(item => {
      const date = parseTimestamp(item.timestamp)
      if (date) {
        // 按粒度对齐时间戳
        const alignedTime = Math.floor(date.getTime() / granularityMs) * granularityMs
        const existing = dataMap.get(alignedTime) || {
          timestamp: new Date(alignedTime).toISOString(),
          cost: 0,
          count: 0,
          models: new Set()
        }
        
        const cost = parseFloat(item.cost) || 0
        existing.cost += cost
        existing.count += 1
        if (item.model) existing.models.add(item.model)
        
        dataMap.set(alignedTime, existing)
      }
    })
    
    // 找到时间范围
    const times = Array.from(dataMap.keys()).sort((a, b) => a - b)
    if (times.length === 0) return { processedData: [], dateSeparators: [], firstOfDaySet: new Set() }
    
    const minTime = times[0]
    const maxTime = times[times.length - 1]
    
    // 填充缺失的时间点
    const filledData = []
    for (let t = minTime; t <= maxTime; t += granularityMs) {
      const existingItem = dataMap.get(t)
      if (existingItem) {
        filledData.push(existingItem)
      } else {
        // 创建一个空数据点
        const date = new Date(t)
        filledData.push({
          timestamp: date.toISOString(),
          cost: 0,
          count: 0,
          models: new Set()
        })
      }
    }
    
    // 计算累积值
    let cumulativeCost = 0
    
    // 处理填充后的数据
    const separators = []
    const firstOfDay = new Set()
    let prevDateStr = null
    
    const processed = filledData.map((item, index) => {
      const date = parseTimestamp(item.timestamp)
      const timeValue = date ? date.getTime() : index
      const dateStr = date ? date.toDateString() : null
      const displayDateStr = date ? `${date.getMonth() + 1}.${date.getDate()}` : ''
      
      // 检测日期变化
      if (dateStr && dateStr !== prevDateStr) {
        firstOfDay.add(timeValue)
        if (prevDateStr !== null) {
          separators.push({
            x: timeValue,
            label: displayDateStr
          })
        }
      }
      prevDateStr = dateStr
      
      cumulativeCost += item.cost
      
      return {
        ...item,
        models: Array.from(item.models),
        timeValue,
        dateStr: displayDateStr,
        timeStr: date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '',
        cumulativeCost,
        hasData: item.cost > 0 || item.count > 0,
      }
    })
    
    return { processedData: processed, dateSeparators: separators, firstOfDaySet: firstOfDay }
  }, [data, granularity])

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload
      const displayLabel = item ? `${item.dateStr} ${item.timeStr}` : label
      
      return (
        <div className="cost-chart-tooltip">
          <p className="tooltip-label">{displayLabel}</p>
          <p className="tooltip-value">
            Cost: <strong>${payload[0].value.toFixed(2)}</strong>
          </p>
          {payload[1] && (
            <p className="tooltip-count">
              Count: <strong>{payload[1].value}</strong>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // 自定义 X 轴刻度渲染
  const CustomXAxisTick = ({ x, y, payload }) => {
    const item = processedData.find(d => d.timeValue === payload.value)
    if (!item) return null
    
    const isFirstOfDay = firstOfDaySet.has(payload.value)
    
    if (granularity === 'day') {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={16}
            textAnchor="middle"
            fill="#90a4ae"
            fontSize={11}
          >
            {item.dateStr}
          </text>
        </g>
      )
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        {isFirstOfDay && (
          <text
            x={0}
            y={0}
            dy={12}
            textAnchor="middle"
            fill="#8b5cf6"
            fontSize={10}
            fontWeight="600"
          >
            {item.dateStr}
          </text>
        )}
        <text
          x={0}
          y={0}
          dy={isFirstOfDay ? 26 : 16}
          textAnchor="middle"
          fill="#90a4ae"
          fontSize={11}
        >
          {item.timeStr}
        </text>
      </g>
    )
  }

  return (
    <div className="cost-trend-chart-card">
      <div className="chart-header">
        <div className="title-row">
          <h3 className="chart-title">
            📊 Cost 趋势
            <span className="chart-type-badge">{chartType === 'cumulative' ? '累积' : '分立'}</span>
          </h3>
        </div>
        
        <div className="chart-controls">
          <div className="control-group">
            <label className="control-label">时间粒度</label>
            <div className="button-group">
              <button
                className={`btn-sm ${granularity === 'hour' ? 'active' : ''}`}
                onClick={() => onGranularityChange?.('hour')}
              >
                小时
              </button>
              <button
                className={`btn-sm ${granularity === 'halfday' ? 'active' : ''}`}
                onClick={() => onGranularityChange?.('halfday')}
              >
                半天
              </button>
              <button
                className={`btn-sm ${granularity === 'day' ? 'active' : ''}`}
                onClick={() => onGranularityChange?.('day')}
              >
                全天
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">图表类型</label>
            <div className="button-group">
              <button
                className={`btn-sm ${chartType === 'discrete' ? 'active' : ''}`}
                onClick={() => onChartTypeChange?.('discrete')}
              >
                分立
              </button>
              <button
                className={`btn-sm ${chartType === 'cumulative' ? 'active' : ''}`}
                onClick={() => onChartTypeChange?.('cumulative')}
              >
                累积
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        {processedData && processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'cumulative' ? (
              <AreaChart
                data={processedData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorCostTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lineGradientCost" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis
                  dataKey="timeValue"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tick={<CustomXAxisTick />}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#90a4ae' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                {dateSeparators.map((sep, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={sep.x}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="cumulativeCost"
                  stroke="url(#lineGradientCost)"
                  strokeWidth={2}
                  fill="url(#colorCostTrend)"
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!payload.hasData) return null
                    return <circle cx={cx} cy={cy} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />
                  }}
                  activeDot={{ r: 6, fill: '#c084fc', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            ) : (
              <LineChart
                data={processedData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="timeValue"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tick={<CustomXAxisTick />}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#90a4ae' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#90a4ae' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {dateSeparators.map((sep, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={sep.x}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    yAxisId="left"
                  />
                ))}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cost"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!payload.hasData) return null
                    return <circle cx={cx} cy={cy} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />
                  }}
                  activeDot={{ r: 6 }}
                  name="Cost"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!payload.hasData) return null
                    return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="#fff" strokeWidth={2} />
                  }}
                  activeDot={{ r: 6 }}
                  name="Count"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <p className="empty-icon">📊</p>
            <p className="empty-text">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CostTrendChart

