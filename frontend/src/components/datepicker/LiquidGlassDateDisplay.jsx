import React from 'react'
import './LiquidGlassDateDisplay.css'

/**
 * LiquidGlassDateDisplay - 日期显示组件
 * @param {string} dateText - 显示的日期文本
 * @param {boolean} flashing - 是否显示闪烁动画
 * @param {string} mode - 效果模式: 'blur' (简洁毛玻璃) | 'liquid' (液态玻璃)
 */
function LiquidGlassDateDisplay({ dateText = '请选择', flashing = false, mode = 'liquid' }) {
  return (
    <div className={`liquidGlass-wrapper date-display mode-${mode} ${flashing ? 'flash-feedback' : ''}`}>
      {/* 液态玻璃核心三层结构 */}
      <div className="liquidGlass-effect"></div>
      <div className="liquidGlass-tint"></div>
      <div className="liquidGlass-shine"></div>
      
      {/* 内容层 */}
      <div className="liquidGlass-text">
        <span className="calendar-icon">📅</span>
        <span className="date-text-value">{dateText}</span>
      </div>

      {/* SVG 滤镜定义 */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="glass-distortion-date-display" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
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
  )
}

export default LiquidGlassDateDisplay
