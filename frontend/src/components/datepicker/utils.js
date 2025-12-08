// 日期工具函数

export function formatDate(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function isInRange(date, startDate, endDate) {
  if (!startDate || !endDate) return false
  return date > startDate && date < endDate
}

function createDayObject(day, date, otherMonth, startDate, endDate) {
  const today = new Date()
  const dateStr = formatDate(date)
  const isToday = isSameDay(date, today)
  const rangeStart = isSameDay(date, startDate)
  const rangeEnd = isSameDay(date, endDate)

  return {
    day,
    date: dateStr,
    dateObj: date,
    otherMonth,
    isToday,
    selected: rangeStart || rangeEnd,
    inRange: isInRange(date, startDate, endDate),
    rangeStart,
    rangeEnd
  }
}

export function createCalendarDays(year, month, startDate, endDate) {
  const days = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let firstDayOfWeek = firstDay.getDay()
  firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = firstDayOfWeek - 1; i > 0; i--) {
    const day = prevMonthLastDay - i + 1
    const date = new Date(year, month - 1, day)
    days.push(createDayObject(day, date, true, startDate, endDate))
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    days.push(createDayObject(day, date, false, startDate, endDate))
  }

  const remainingCells = 42 - days.length
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day)
    days.push(createDayObject(day, date, true, startDate, endDate))
  }

  return days
}

export function getWeekdays() {
  return ['一', '二', '三', '四', '五', '六', '日']
}

