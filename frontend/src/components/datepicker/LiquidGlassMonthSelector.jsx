import React from 'react'
import './LiquidGlassMonthSelector.css'

function LiquidGlassMonthSelector({ year, month, onPrev, onNext }) {
  const monthText = `${year}年${month + 1}月`

  return (
    <div className="month-selector">
      <button className="month-nav" onClick={onPrev}>◀</button>
      <div className="current-month">{monthText}</div>
      <button className="month-nav" onClick={onNext}>▶</button>
    </div>
  )
}

export default LiquidGlassMonthSelector

