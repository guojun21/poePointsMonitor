import React from 'react'
import LiquidGlassDateDisplay from './LiquidGlassDateDisplay'
import './DateRangeSelector.css'

/**
 * DateRangeSelector - 日期范围选择器
 * @param {string} mode - 效果模式: 'blur' (毛玻璃) | 'svg' (SVG滤镜)
 */
function DateRangeSelector({ startDateText, endDateText, flashStart, flashEnd, mode = 'blur' }) {
  return (
    <div className="date-range-selector">
      <div className="date-input-group">
        <div className="date-label">开始日期</div>
        <LiquidGlassDateDisplay
          dateText={startDateText}
          flashing={flashStart}
          mode={mode}
        />
      </div>

      <div className="date-separator">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>

      <div className="date-input-group">
        <div className="date-label">结束日期</div>
        <LiquidGlassDateDisplay
          dateText={endDateText}
          flashing={flashEnd}
          mode={mode}
        />
      </div>
    </div>
  )
}

export default DateRangeSelector

