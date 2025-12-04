import React, { useMemo } from 'react';
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
} from 'recharts';
import { Card, Button } from '../common';
import './PointsChart.css';

// 解析时间戳字符串为 Date 对象
const parseTimestamp = (timestamp) => {
  // 格式: "2025-12-01 22:00" 或 "2025-12-01"
  if (!timestamp) return null;
  const parts = timestamp.split(' ');
  const dateParts = parts[0].split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const day = parseInt(dateParts[2]);
  
  if (parts[1]) {
    const timeParts = parts[1].split(':');
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1] || 0);
    return new Date(year, month, day, hour, minute);
  }
  return new Date(year, month, day);
};

// 格式化时间显示（只显示时分，日期变化时显示日期）
const formatTimeLabel = (timestamp, prevTimestamp, granularity) => {
  const date = parseTimestamp(timestamp);
  const prevDate = prevTimestamp ? parseTimestamp(prevTimestamp) : null;
  
  if (!date) return timestamp;
  
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${date.getMonth() + 1}.${date.getDate()}`;
  
  // 如果是全天粒度，只显示日期
  if (granularity === 'day') {
    return dateStr;
  }
  
  // 如果日期变化了，显示日期
  if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
    return `${dateStr}\n${timeStr}`;
  }
  
  return timeStr;
};

const PointsChart = ({ data, granularity, chartType, periodOffset, periodLabel, onGranularityChange, onChartTypeChange, onPeriodChange }) => {
  
  // 根据粒度获取时间间隔（毫秒）
  const getGranularityMs = (gran) => {
    switch (gran) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'halfday': return 12 * 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  };

  // 处理数据：填充缺失的时间点，添加时间戳数值用于时间轴，并计算日期分隔线
  const { processedData, dateSeparators, firstOfDaySet } = useMemo(() => {
    if (!data || data.length === 0) return { processedData: [], dateSeparators: [], firstOfDaySet: new Set() };
    
    // 1. 先把原始数据转换为 Map，key 是时间戳（按粒度对齐）
    const granularityMs = getGranularityMs(granularity);
    const dataMap = new Map();
    
    data.forEach(item => {
      const date = parseTimestamp(item.timestamp);
      if (date) {
        // 按粒度对齐时间戳
        const alignedTime = Math.floor(date.getTime() / granularityMs) * granularityMs;
        dataMap.set(alignedTime, item);
      }
    });
    
    // 2. 找到时间范围
    const times = Array.from(dataMap.keys()).sort((a, b) => a - b);
    if (times.length === 0) return { processedData: [], dateSeparators: [], firstOfDaySet: new Set() };
    
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    
    // 3. 填充缺失的时间点
    const filledData = [];
    for (let t = minTime; t <= maxTime; t += granularityMs) {
      const existingItem = dataMap.get(t);
      if (existingItem) {
        filledData.push(existingItem);
      } else {
        // 创建一个空数据点
        const date = new Date(t);
        const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        filledData.push({
          timestamp,
          point_cost: 0,
          record_count: 0,
        });
      }
    }
    
    // 4. 处理填充后的数据
    const separators = [];
    const firstOfDay = new Set();
    let prevDateStr = null;
    
    const processed = filledData.map((item, index) => {
      const date = parseTimestamp(item.timestamp);
      const timeValue = date ? date.getTime() : index;
      const dateStr = date ? date.toDateString() : null;
      const displayDateStr = date ? `${date.getMonth() + 1}.${date.getDate()}` : '';
      
      // 检测日期变化
      if (dateStr && dateStr !== prevDateStr) {
        firstOfDay.add(timeValue);
        if (prevDateStr !== null) {
          separators.push({
            x: timeValue,
            label: displayDateStr
          });
        }
      }
      prevDateStr = dateStr;
      
      return {
        ...item,
        timeValue,
        dateStr: displayDateStr,
        timeStr: date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '',
        hasData: item.point_cost > 0 || item.record_count > 0, // 标记是否有实际数据
      };
    });
    
    return { processedData: processed, dateSeparators: separators, firstOfDaySet: firstOfDay };
  }, [data, granularity]);

  // 自定义 X 轴刻度格式化
  const formatXAxis = (timeValue) => {
    const item = processedData.find(d => d.timeValue === timeValue);
    if (!item) return '';
    
    if (granularity === 'day') {
      return item.dateStr;
    }
    return item.timeStr;
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      const displayLabel = item ? `${item.dateStr} ${item.timeStr}` : label;
      
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{displayLabel}</p>
          <p className="tooltip-value">
            积分消耗: <strong>{payload[0].value.toLocaleString()}</strong>
          </p>
          {payload[1] && (
            <p className="tooltip-count">
              记录数: <strong>{payload[1].value}</strong>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // 自定义 X 轴刻度渲染（显示日期分隔）
  const CustomXAxisTick = ({ x, y, payload }) => {
    const item = processedData.find(d => d.timeValue === payload.value);
    if (!item) return null;
    
    // 只有当这个时间点是该日期的第一个数据点时才显示日期
    const isFirstOfDay = firstOfDaySet.has(payload.value);
    
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
      );
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        {isFirstOfDay && (
          <text
            x={0}
            y={0}
            dy={12}
            textAnchor="middle"
            fill="#667eea"
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
    );
  };

  return (
    <Card className="points-chart-card">
      <div className="chart-header">
        <div className="title-row">
          <h3 className="chart-title">
            📈 积分消耗趋势
            <span className="chart-type-badge">{chartType === 'cumulative' ? '累积' : '分立'}</span>
          </h3>
          
          <div className="period-controls">
            <Button
              variant="secondary"
              onClick={() => onPeriodChange(periodOffset - 1)}
              className="btn-sm period-btn"
            >
              ← 上月
            </Button>
            <span className="period-label">{periodLabel || '当前周期'}</span>
            <Button
              variant="secondary"
              onClick={() => onPeriodChange(periodOffset + 1)}
              className="btn-sm period-btn"
              disabled={periodOffset >= 0}
            >
              下月 →
            </Button>
          </div>
        </div>
        
        <div className="chart-controls">
          <div className="control-group">
            <label className="control-label">时间粒度</label>
            <div className="button-group">
              <Button
                variant={granularity === 'minute' ? 'primary' : 'secondary'}
                onClick={() => onGranularityChange('minute')}
                className="btn-sm"
              >
                分钟
              </Button>
              <Button
                variant={granularity === 'hour' ? 'primary' : 'secondary'}
                onClick={() => onGranularityChange('hour')}
                className="btn-sm"
              >
                小时
              </Button>
              <Button
                variant={granularity === 'halfday' ? 'primary' : 'secondary'}
                onClick={() => onGranularityChange('halfday')}
                className="btn-sm"
              >
                半天
              </Button>
              <Button
                variant={granularity === 'day' ? 'primary' : 'secondary'}
                onClick={() => onGranularityChange('day')}
                className="btn-sm"
              >
                全天
              </Button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">图表类型</label>
            <div className="button-group">
              <Button
                variant={chartType === 'discrete' ? 'primary' : 'secondary'}
                onClick={() => onChartTypeChange('discrete')}
                className="btn-sm"
              >
                分立
              </Button>
              <Button
                variant={chartType === 'cumulative' ? 'primary' : 'secondary'}
                onClick={() => onChartTypeChange('cumulative')}
                className="btn-sm"
              >
                累积
              </Button>
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
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="50%" stopColor="#764ba2" />
                    <stop offset="100%" stopColor="#f093fb" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis
                  dataKey="timeValue"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tick={<CustomXAxisTick />}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={false}
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#90a4ae' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* 日期分隔虚线 */}
                {dateSeparators.map((sep, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={sep.x}
                    stroke="#667eea"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="point_cost"
                  stroke="url(#lineGradient)"
                  strokeWidth={2}
                  fill="url(#colorCost)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.hasData) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#667eea" stroke="#fff" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 6, fill: '#764ba2', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            ) : (
              <LineChart
                data={processedData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="timeValue"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tick={<CustomXAxisTick />}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={false}
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#90a4ae' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
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
                {/* 日期分隔虚线 */}
                {dateSeparators.map((sep, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={sep.x}
                    stroke="#667eea"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    yAxisId="left"
                  />
                ))}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="point_cost"
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.hasData) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#667eea" stroke="#fff" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 6 }}
                  name="积分消耗"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="record_count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.hasData) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="#fff" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 6 }}
                  name="记录数"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <p className="empty-icon">📊</p>
            <p className="empty-text">暂无数据，请先拉取积分历史记录</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PointsChart;

