import React, { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import './CostTrendCard.css'

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

/**
 * CostTrendCard - Cost 趋势折线图卡片
 * 直接显示折线图，与其他统计卡片平行
 */
function CostTrendCard({ data, mode = 'blur' }) {
  const [granularity, setGranularity] = useState('hour')
  const [chartType, setChartType] = useState('discrete')

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

  // 处理数据
  const { processedData, dateSeparators, firstOfDaySet } = useMemo(() => {
    if (!data || data.length === 0) return { processedData: [], dateSeparators: [], firstOfDaySet: new Set() }
    
    const granularityMs = getGranularityMs(granularity)
    const dataMap = new Map()
    
    // 按时间分组并聚合
    data.forEach(item => {
      const date = parseTimestamp(item.timestamp)
      if (date) {
        const alignedTime = Math.floor(date.getTime() / granularityMs) * granularityMs
        const existing = dataMap.get(alignedTime) || {
          timestamp: new Date(alignedTime).toISOString(),
          cost: 0,
          count: 0,
        }
        
        const cost = parseFloat(item.cost) || 0
        existing.cost += cost
        existing.count += 1
        dataMap.set(alignedTime, existing)
      }
    })
    
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
        filledData.push({
          timestamp: new Date(t).toISOString(),
          cost: 0,
          count: 0,
        })
      }
    }
    
    // 计算累积值
    let cumulativeCost = 0
    const separators = []
    const firstOfDay = new Set()
    let prevDateStr = null
    
    const processed = filledData.map((item, index) => {
      const date = parseTimestamp(item.timestamp)
      const timeValue = date ? date.getTime() : index
      const dateStr = date ? date.toDateString() : null
      const displayDateStr = date ? `${date.getMonth() + 1}.${date.getDate()}` : ''
      
      if (dateStr && dateStr !== prevDateStr) {
        firstOfDay.add(timeValue)
        if (prevDateStr !== null) {
          separators.push({ x: timeValue, label: displayDateStr })
        }
      }
      prevDateStr = dateStr
      
      cumulativeCost += item.cost
      
      return {
        ...item,
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
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload
      const displayLabel = item ? `${item.dateStr} ${item.timeStr}` : ''
      
      return (
        <div className="cost-trend-tooltip">
          <p className="tooltip-label">{displayLabel}</p>
          <p className="tooltip-value">
            Cost: <strong>${payload[0].value.toFixed(4)}</strong>
          </p>
          {item?.count > 0 && (
            <p className="tooltip-count">
              Count: <strong>{item.count}</strong>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // 自定义 X 轴刻度
  const CustomXAxisTick = ({ x, y, payload }) => {
    const item = processedData.find(d => d.timeValue === payload.value)
    if (!item) return null
    
    const isFirstOfDay = firstOfDaySet.has(payload.value)
    
    if (granularity === 'day') {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={12} textAnchor="middle" fill="#90a4ae" fontSize={9}>
            {item.dateStr}
          </text>
        </g>
      )
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        {isFirstOfDay && (
          <text x={0} y={0} dy={10} textAnchor="middle" fill="#8b5cf6" fontSize={8} fontWeight="600">
            {item.dateStr}
          </text>
        )}
        <text x={0} y={0} dy={isFirstOfDay ? 20 : 12} textAnchor="middle" fill="#90a4ae" fontSize={9}>
          {item.timeStr}
        </text>
      </g>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className={`cost-trend-card mode-${mode}`}>
      {/* 背景效果层 */}
      <div className="card-bg-effect"></div>
      
      {/* 内容层 */}
      <div className="card-content">
        {/* 头部：标题和控制按钮 */}
        <div className="card-header">
          <div className="card-title">
            <span className="title-icon">📈</span>
            <span className="title-text">Cost 趋势</span>
            <span className="chart-type-badge">{chartType === 'cumulative' ? '累积' : '分立'}</span>
          </div>
          
          <div className="card-controls">
            {/* 时间粒度 */}
            <div className="control-group">
              {['minute', 'hour', 'halfday', 'day'].map(g => (
                <button
                  key={g}
                  className={`ctrl-btn ${granularity === g ? 'active' : ''}`}
                  onClick={() => setGranularity(g)}
                >
                  {g === 'minute' ? '分' : g === 'hour' ? '时' : g === 'halfday' ? '半天' : '天'}
                </button>
              ))}
            </div>
            
            {/* 图表类型 */}
            <div className="control-group">
              <button
                className={`ctrl-btn ${chartType === 'discrete' ? 'active' : ''}`}
                onClick={() => setChartType('discrete')}
              >
                分立
              </button>
              <button
                className={`ctrl-btn ${chartType === 'cumulative' ? 'active' : ''}`}
                onClick={() => setChartType('cumulative')}
              >
                累积
              </button>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="chart-area">
          {processedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              {chartType === 'cumulative' ? (
                <AreaChart data={processedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="timeValue"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tick={<CustomXAxisTick />}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    height={35}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#90a4ae' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {dateSeparators.map((sep, idx) => (
                    <ReferenceLine key={idx} x={sep.x} stroke="#8b5cf6" strokeDasharray="4 4" strokeOpacity={0.4} />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="cumulativeCost"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#costGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#c084fc', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={processedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="timeValue"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tick={<CustomXAxisTick />}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    height={35}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#90a4ae' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {dateSeparators.map((sep, idx) => (
                    <ReferenceLine key={idx} x={sep.x} stroke="#8b5cf6" strokeDasharray="4 4" strokeOpacity={0.4} />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">
              <span>暂无数据</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CostTrendCard





