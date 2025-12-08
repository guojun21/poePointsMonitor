import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { formatDate, createCalendarDays, getWeekdays } from './utils'

export function useDatePicker(initialYear = new Date().getFullYear(), initialMonth = new Date().getMonth()) {
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [currentYear, setCurrentYear] = useState(initialYear)
  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [selectingStart, setSelectingStart] = useState(true)
  const [flashStart, setFlashStart] = useState(false)
  const [flashEnd, setFlashEnd] = useState(false)
  
  const weekdays = getWeekdays()
  
  const startTimerRef = useRef(null)
  const endTimerRef = useRef(null)

  // 清理定时器
  useEffect(() => {
    return () => {
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
    }
  }, [])

  const triggerFlash = useCallback((target) => {
    if (target === 'start' || target === 'both') {
      setFlashStart(false)
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
      // 使用 requestAnimationFrame 确保状态更新
      requestAnimationFrame(() => {
        setFlashStart(true)
        startTimerRef.current = setTimeout(() => {
          setFlashStart(false)
        }, 400)
      })
    }

    if (target === 'end' || target === 'both') {
      setFlashEnd(false)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
      requestAnimationFrame(() => {
        setFlashEnd(true)
        endTimerRef.current = setTimeout(() => {
          setFlashEnd(false)
        }, 400)
      })
    }
  }, [])

  const currentMonthText = useMemo(() => 
    `${currentYear}年${currentMonth + 1}月`, 
    [currentYear, currentMonth]
  )

  const startDateText = useMemo(() => 
    startDate ? formatDate(startDate) : '请选择', 
    [startDate]
  )

  const endDateText = useMemo(() => 
    endDate ? formatDate(endDate) : '请选择', 
    [endDate]
  )

  const calendarDays = useMemo(() => 
    createCalendarDays(currentYear, currentMonth, startDate, endDate),
    [currentYear, currentMonth, startDate, endDate]
  )

  const selectDate = useCallback((dayObj) => {
    if (dayObj.otherMonth) return

    const date = dayObj.dateObj

    if (selectingStart || !startDate) {
      setStartDate(date)
      setEndDate(null)
      setSelectingStart(false)
      triggerFlash('start')
    } else {
      if (date < startDate) {
        setEndDate(startDate)
        setStartDate(date)
        triggerFlash('both')
      } else {
        setEndDate(date)
        triggerFlash('end')
      }
      setSelectingStart(true)
    }
  }, [selectingStart, startDate, triggerFlash])

  const clearDates = useCallback(() => {
    triggerFlash('both')
    setTimeout(() => {
      setStartDate(null)
      setEndDate(null)
      setSelectingStart(true)
    }, 100)
  }, [triggerFlash])

  const confirmDates = useCallback(() => ({
    start: startDate,
    end: endDate
  }), [startDate, endDate])

  const prevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }, [currentMonth])

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }, [currentMonth])

  return {
    // 状态
    startDate,
    endDate,
    currentYear,
    currentMonth,
    selectingStart,
    weekdays,
    
    // 反馈状态
    flashStart,
    flashEnd,
    
    // 计算属性
    currentMonthText,
    startDateText,
    endDateText,
    calendarDays,
    
    // 方法
    selectDate,
    clearDates,
    confirmDates,
    prevMonth,
    nextMonth,
    triggerFlash,
    setStartDate,
    setEndDate
  }
}

