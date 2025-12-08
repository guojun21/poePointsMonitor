import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import DateRangeSelector from './DateRangeSelector'
import LiquidGlassCalendar from './LiquidGlassCalendar'
import DatePickerActions from './DatePickerActions'
import { useDatePicker } from './useDatePicker'
import './LiquidGlassDatePicker.css'

/**
 * LiquidGlassDatePicker - 液态玻璃风格日期选择器
 * @param {Object} value - 日期范围值 { start: Date, end: Date }
 * @param {Function} onChange - 值变化回调
 * @param {Function} onConfirm - 确认回调
 * @param {string} mode - 效果模式: 'blur' (简洁毛玻璃) | 'liquid' (液态玻璃)
 */
function LiquidGlassDatePicker({ value, onChange, onConfirm, mode = 'liquid' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const {
    startDate,
    endDate,
    currentYear,
    currentMonth,
    weekdays,
    flashStart,
    flashEnd,
    startDateText,
    endDateText,
    calendarDays,
    selectDate,
    clearDates,
    confirmDates,
    prevMonth,
    nextMonth,
    setStartDate,
    setEndDate
  } = useDatePicker()

  // 同步外部值
  useEffect(() => {
    if (value?.start) {
      setStartDate(value.start)
    }
    if (value?.end) {
      setEndDate(value.end)
    }
  }, [value])

  // 点击外部关闭 - 需要同时检查 trigger 和 dropdown（因为 dropdown 是 portal 渲染的）
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideTrigger = containerRef.current && !containerRef.current.contains(event.target)
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target)
      
      // 只有当点击既不在 trigger 也不在 dropdown 内时才关闭
      if (clickedOutsideTrigger && clickedOutsideDropdown) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleClear = () => {
    clearDates()
    onChange?.({ start: null, end: null })
  }

  const handleConfirm = () => {
    const result = confirmDates()
    onChange?.(result)
    onConfirm?.(result)
    setIsOpen(false)
  }

  const displayText = startDate && endDate 
    ? `${startDateText} ~ ${endDateText}`
    : startDate 
      ? `${startDateText} ~ 请选择`
      : '选择日期范围'

  const isLiquidMode = mode === 'liquid'

  // 计算 dropdown 位置
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
  }

  const handleToggle = () => {
    if (!isOpen) {
      updateDropdownPosition()
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="liquid-glass-date-picker" ref={containerRef}>
      <button 
        ref={triggerRef}
        className={`date-picker-trigger ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="trigger-text">{displayText}</span>
        <svg className={`chevron ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && ReactDOM.createPortal(
        <>
          <div className="date-picker-overlay" onClick={() => setIsOpen(false)} />
          <div 
            ref={dropdownRef}
            className={`date-picker-dropdown animate-scale-in mode-${mode}`}
            style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
          >
          {/* 液态玻璃效果层 - 核心三层结构 */}
          <div className="liquidGlass-effect"></div>
          <div className="liquidGlass-tint"></div>
          <div className="liquidGlass-shine"></div>
          
          {/* 内容层 */}
          <div className="liquidGlass-content">
            <DateRangeSelector
              startDateText={startDateText}
              endDateText={endDateText}
              flashStart={flashStart}
              flashEnd={flashEnd}
              mode={mode}
            />

            <LiquidGlassCalendar
              year={currentYear}
              month={currentMonth}
              weekdays={weekdays}
              calendarDays={calendarDays}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onSelectDate={selectDate}
            />

            <DatePickerActions
              onClear={handleClear}
              onConfirm={handleConfirm}
            />
          </div>
          
          {/* SVG 滤镜定义 - 液态玻璃模式使用 */}
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <filter id="glass-distortion-dropdown" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
                <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
                <feComponentTransfer in="turbulence" result="mapped">
                  <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
                  <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
                  <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
                </feComponentTransfer>
                <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
                <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
                  <fePointLight x="-200" y="-200" z="300" />
                </feSpecularLighting>
                <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
                <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default LiquidGlassDatePicker
