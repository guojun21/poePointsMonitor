import React from 'react'
import './DatePickerActions.css'

function DatePickerActions({ onClear, onConfirm }) {
  return (
    <div className="date-picker-actions">
      <button className="action-btn clear-btn" onClick={onClear}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        清除
      </button>
      <button className="action-btn confirm-btn" onClick={onConfirm}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        确定
      </button>
    </div>
  )
}

export default DatePickerActions

