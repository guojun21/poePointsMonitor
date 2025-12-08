import React, { useRef, useEffect, useState } from 'react'
import './DataTable.css'

function DataTable({ data, columns, sortConfig, onSort, density }) {
  const tableRef = useRef(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  
  const rowHeight = density === 'compact' ? 36 : density === 'comfortable' ? 52 : 44
  const headerHeight = 48
  
  // 虚拟滚动
  useEffect(() => {
    const container = tableRef.current
    if (!container) return
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const viewportHeight = container.clientHeight
      
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 10)
      const end = Math.min(data.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 10)
      
      setVisibleRange({ start, end })
    }
    
    container.addEventListener('scroll', handleScroll)
    handleScroll()
    
    return () => container.removeEventListener('scroll', handleScroll)
  }, [data.length, rowHeight])

  // 格式化单元格值
  const formatCellValue = (value, column) => {
    if (value === null || value === undefined || value === '') {
      return <span className="cell-empty">-</span>
    }
    
    // 日期格式化
    if (column.toLowerCase().includes('date')) {
      try {
        const date = new Date(value)
        if (!isNaN(date)) {
          return (
            <span className="cell-date">
              {date.toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          )
        }
      } catch (e) {}
    }
    
    // 数字格式化
    const num = parseFloat(value)
    if (!isNaN(num) && String(value).match(/^[\d.]+$/)) {
      // 货币/成本
      if (column.toLowerCase().includes('cost')) {
        return <span className="cell-cost">${num.toFixed(2)}</span>
      }
      // Token 数量
      if (column.toLowerCase().includes('token')) {
        return <span className="cell-number">{num.toLocaleString()}</span>
      }
      return <span className="cell-number">{num.toLocaleString()}</span>
    }
    
    // 特殊状态标签
    if (column.toLowerCase() === 'kind') {
      const colorMap = {
        'Included': 'blue',
        'Premium': 'purple',
        'Standard': 'green'
      }
      const color = colorMap[value] || 'default'
      return <span className={`cell-tag tag-${color}`}>{value}</span>
    }
    
    // Max Mode
    if (column.toLowerCase().includes('max mode')) {
      return (
        <span className={`cell-badge ${value === 'Yes' ? 'badge-success' : 'badge-default'}`}>
          {value}
        </span>
      )
    }
    
    // Model 名称
    if (column.toLowerCase() === 'model') {
      return <span className="cell-model">{value}</span>
    }
    
    return <span className="cell-text">{value}</span>
  }

  // 获取排序图标
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="sort-icon inactive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 15l5 5 5-5"/>
          <path d="M7 9l5-5 5 5"/>
        </svg>
      )
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="sort-icon active" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 14l5-5 5 5"/>
      </svg>
    ) : (
      <svg className="sort-icon active" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 10l5 5 5-5"/>
      </svg>
    )
  }

  const totalHeight = data.length * rowHeight
  const offsetY = visibleRange.start * rowHeight

  return (
    <div className={`table-container density-${density}`} ref={tableRef}>
      <div className="table-wrapper" style={{ height: totalHeight + headerHeight }}>
        <table className="data-table">
          <thead className="table-header" style={{ position: 'sticky', top: 0 }}>
            <tr>
              <th className="row-number-header">#</th>
              {columns.map((column, index) => (
                <th 
                  key={column}
                  className="table-th"
                  onClick={() => onSort(column)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="th-content">
                    <span className="th-text">{column}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ transform: `translateY(${offsetY}px)` }}>
            {data.slice(visibleRange.start, visibleRange.end).map((row, index) => {
              const actualIndex = visibleRange.start + index
              return (
                <tr 
                  key={actualIndex} 
                  className="table-row"
                  style={{ height: rowHeight }}
                >
                  <td className="row-number">{actualIndex + 1}</td>
                  {columns.map(column => (
                    <td key={column} className="table-td">
                      {formatCellValue(row[column], column)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable





