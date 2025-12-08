import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import CostTrendChart from './CostTrendChart'
import './StatisticBar.css'

/**
 * CostStatCard - Cost 趋势统计卡片
 * 点击展开显示 Cost 趋势图
 */
function CostStatCard({ stats, data, mode = 'liquid' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [granularity, setGranularity] = useState('hour')
  const [chartType, setChartType] = useState('discrete')
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('.cost-stat-card-dropdown')
      if (dropdown && dropdown.contains(event.target)) {
        return
      }
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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

  // 计算 dropdown 位置
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
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
    <div className="stat-card" ref={containerRef}>
      <button 
        ref={triggerRef}
        className={`stat-card-trigger ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
      >
        <div className="stat-card-icon cost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v12"/>
            <path d="M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/>
          </svg>
        </div>
        <div className="stat-card-info">
          <div className="stat-card-label">Cost Trend</div>
          <div className="stat-card-value cost">${stats?.totalCost?.toFixed(2) || '0.00'}</div>
        </div>
        <svg className={`stat-card-chevron ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && ReactDOM.createPortal(
        <>
          <div className="stat-card-overlay" onClick={() => setIsOpen(false)} />
          <div 
            className={`cost-stat-card-dropdown stat-card-dropdown animate-stat-in mode-${mode}`}
            style={{ top: dropdownPosition.top, left: dropdownPosition.left, minWidth: '800px' }}
          >
            {/* 液态玻璃效果层 */}
            <div className="liquidGlass-effect"></div>
            <div className="liquidGlass-tint"></div>
            <div className="liquidGlass-shine"></div>
            
            {/* 内容层 */}
            <div className="liquidGlass-content" style={{ padding: '20px' }}>
              <CostTrendChart
                data={data}
                granularity={granularity}
                chartType={chartType}
                onGranularityChange={setGranularity}
                onChartTypeChange={setChartType}
              />
            </div>
            
            {/* SVG 滤镜定义 */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="glass-distortion-stat-cost" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
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

export default CostStatCard
