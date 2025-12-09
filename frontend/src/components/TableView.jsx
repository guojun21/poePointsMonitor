import React, { useState, useEffect, useMemo } from 'react'
import DataTable from './data-table/DataTable'
import StatisticBar from './statistics/StatisticBar'
import { LiquidGlassDatePicker } from './datepicker'
import { 
  convertToTableData, 
  getTableColumns, 
  filterByDateRange, 
  sortData,
  calculateStatistics 
} from '../utils/poeDataAdapter'
import './TableView.css'

const TableView = () => {
  const [rawData, setRawData] = useState([])
  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [columns, setColumns] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: '创建时间', direction: 'desc' })
  const [density, setDensity] = useState('default')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [loading, setLoading] = useState(true)

  // 获取数据
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:58232/api/history')
      const data = await response.json()
      
      setRawData(data || [])
      const converted = convertToTableData(data || [])
      setTableData(converted)
      setFilteredData(converted)
      setColumns(getTableColumns())
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 处理排序
  const handleSort = (column) => {
    const newDirection = 
      sortConfig.key === column && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    
    setSortConfig({ key: column, direction: newDirection })
  }

  // 排序数据
  const sortedData = useMemo(() => {
    return sortData(filteredData, sortConfig.key, sortConfig.direction)
  }, [filteredData, sortConfig])

  // 日期范围过滤
  useEffect(() => {
    const filtered = filterByDateRange(tableData, dateRange)
    setFilteredData(filtered)
  }, [tableData, dateRange])

  // 计算统计信息
  const statistics = useMemo(() => {
    return calculateStatistics(filteredData)
  }, [filteredData])

  if (loading) {
    return (
      <div className="table-view loading-container">
        <div className="loading-spinner"></div>
        <p>加载数据中...</p>
      </div>
    )
  }

  return (
    <div className="table-view">
      {/* 顶部工具栏 */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="data-info">
            <span className="data-count">
              {filteredData.length !== tableData.length 
                ? `${filteredData.length.toLocaleString()} / ${tableData.length.toLocaleString()} 条记录`
                : `${tableData.length.toLocaleString()} 条记录`
              }
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          {/* 日期范围筛选 */}
          <LiquidGlassDatePicker
            value={dateRange}
            onChange={setDateRange}
            mode="blur"
          />
          
          {/* 刷新按钮 */}
          <button 
            className="toolbar-btn icon-btn" 
            onClick={fetchData}
            title="刷新"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          
          {/* 密度切换 */}
          <div className="density-toggle" title="行密度">
            <button 
              className={`density-btn ${density === 'compact' ? 'active' : ''}`}
              onClick={() => setDensity('compact')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="3" y1="14" x2="21" y2="14"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <button 
              className={`density-btn ${density === 'default' ? 'active' : ''}`}
              onClick={() => setDensity('default')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="5" x2="21" y2="5"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="19" x2="21" y2="19"/>
              </svg>
            </button>
            <button 
              className={`density-btn ${density === 'comfortable' ? 'active' : ''}`}
              onClick={() => setDensity('comfortable')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="4" x2="21" y2="4"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="20" x2="21" y2="20"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息栏 */}
      <StatisticBar 
        data={sortedData} 
        columns={columns}
        glassMode="blur"
      />

      {/* 数据表格 */}
      <div className="table-content">
        <DataTable
          data={sortedData}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          density={density}
        />
      </div>
    </div>
  )
}

export default TableView

