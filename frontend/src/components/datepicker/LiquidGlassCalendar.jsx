import React from 'react'
import LiquidGlassMonthSelector from './LiquidGlassMonthSelector'
import './LiquidGlassCalendar.css'

function LiquidGlassCalendar({ 
  year, 
  month, 
  weekdays, 
  calendarDays, 
  onPrevMonth, 
  onNextMonth,
  onSelectDate 
}) {
  return (
    <div className="calendar-panel">
      <LiquidGlassMonthSelector
        year={year}
        month={month}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
      />

      <div className="weekdays">
        {weekdays.map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="days-grid">
        {calendarDays.map(day => (
          <button
            key={day.date}
            className={`day-cell ${day.otherMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.selected ? 'selected' : ''} ${day.inRange ? 'in-range' : ''} ${day.rangeStart ? 'range-start' : ''} ${day.rangeEnd ? 'range-end' : ''}`}
            onClick={() => onSelectDate(day)}
          >
            {day.day}
          </button>
        ))}
      </div>
    </div>
  )
}

export default LiquidGlassCalendar

