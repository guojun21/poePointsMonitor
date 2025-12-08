import React, { useState, useCallback, useEffect, useRef } from 'react'
import { LiquidGlassDatePicker } from '../datepicker'
import './Header.css'

// 同步间隔选项（毫秒）
const SYNC_INTERVAL_OPTIONS = [
  { label: '关闭', value: 0 },
  { label: '10秒', value: 10 * 1000 },
  { label: '30秒', value: 30 * 1000 },
  { label: '1分钟', value: 60 * 1000 },
  { label: '5分钟', value: 5 * 60 * 1000 },
  { label: '10分钟', value: 10 * 60 * 1000 },
  { label: '30分钟', value: 30 * 60 * 1000 },
]

function Header({ 
  fileName, 
  recordCount,
  filteredCount,
  onFileSelect, 
  onRefresh, 
  onToggleSettings,
  showSettings,
  density,
  onDensityChange,
  dateRange,
  onDateRangeChange,
  hasData,
  onPullData,
  isPulling,
  lastSyncTime,
  syncInterval,
  onSyncIntervalChange
}) {
  const [showSyncMenu, setShowSyncMenu] = useState(false)
  const syncMenuRef = useRef(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target)) {
        setShowSyncMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 格式化最后同步时间
  const formatSyncTime = useCallback((timestamp) => {
    if (!timestamp) return '从未同步'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }, [])

  // 获取当前同步间隔的标签
  const getCurrentIntervalLabel = useCallback(() => {
    const option = SYNC_INTERVAL_OPTIONS.find(o => o.value === syncInterval)
    return option ? option.label : '关闭'
  }, [syncInterval])
  return (
    <header className="header drag-region">
      <div className="header-left">
        {fileName && (
          <div className="file-info animate-fade-in">
            <span className="file-name">{fileName}</span>
            <span className="record-count">
              {filteredCount !== recordCount 
                ? `${filteredCount.toLocaleString()} / ${recordCount.toLocaleString()} 条记录`
                : `${recordCount.toLocaleString()} 条记录`
              }
            </span>
          </div>
        )}
      </div>
      
      <div className="header-right no-drag">
        {/* 日期范围筛选 */}
        {hasData && (
          <LiquidGlassDatePicker
            value={dateRange}
            onChange={onDateRangeChange}
            mode="blur"
          />
        )}
        
        {/* 刷新按钮 */}
        <button 
          className="header-btn icon-btn" 
          onClick={onRefresh}
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
            onClick={() => onDensityChange('compact')}
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
            onClick={() => onDensityChange('default')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="5" x2="21" y2="5"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="19" x2="21" y2="19"/>
            </svg>
          </button>
          <button 
            className={`density-btn ${density === 'comfortable' ? 'active' : ''}`}
            onClick={() => onDensityChange('comfortable')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="4" x2="21" y2="4"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="20" x2="21" y2="20"/>
            </svg>
          </button>
        </div>
        
        {/* 列设置按钮 */}
        <button 
          className={`header-btn icon-btn ${showSettings ? 'active' : ''}`}
          onClick={onToggleSettings}
          title="列设置"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        
        {/* 同步控制区域 */}
        {onPullData && (
          <div className="sync-group">
            {/* 同步间隔选择器 */}
            <div className="sync-interval-wrapper" ref={syncMenuRef}>
              <button 
                className="sync-interval-btn"
                onClick={() => setShowSyncMenu(!showSyncMenu)}
                title="设置自动同步间隔"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="interval-label">{getCurrentIntervalLabel()}</span>
                <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              
              {showSyncMenu && (
                <div className="sync-menu">
                  <div className="sync-menu-header">自动同步间隔</div>
                  {SYNC_INTERVAL_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      className={`sync-menu-item ${syncInterval === option.value ? 'active' : ''}`}
                      onClick={() => {
                        onSyncIntervalChange(option.value)
                        setShowSyncMenu(false)
                      }}
                    >
                      {option.label}
                      {syncInterval === option.value && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 最后同步时间 */}
            <span className="last-sync-time" title={lastSyncTime ? new Date(lastSyncTime).toLocaleString() : '从未同步'}>
              {formatSyncTime(lastSyncTime)}
            </span>

            {/* Pull 按钮 */}
            <button 
              className="header-btn pull-btn"
              onClick={onPullData}
              disabled={isPulling}
              title="从 Cursor 拉取最新数据"
            >
              {isPulling ? (
                <>
                  <div className="btn-spinner"></div>
                  <span>同步中...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Pull</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* 打开文件按钮 */}
        <button 
          className="header-btn primary-btn"
          onClick={onFileSelect}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          打开文件
        </button>
      </div>
    </header>
  )
}

export default Header
