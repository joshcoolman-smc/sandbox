import { useState, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'

const CalendarWidget = ({ initialDate = new Date(), onDateSelect, className = '' }) => {
  // Get Sunday of a given date's week
  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Initialize state
  const [today] = useState(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(initialDate))
  const [selectedDate, setSelectedDate] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [direction, setDirection] = useState('next')
  const [showMonthSelector, setShowMonthSelector] = useState(false)
  const [monthPage, setMonthPage] = useState(0)

  // Generate array of 7 dates for the week
  const getWeekDays = (startDate) => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      return date
    })
  }

  // Check if two dates are the same day
  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false
    return date1.toDateString() === date2.toDateString()
  }

  // Navigate to next/previous week
  const navigateWeek = (dir) => {
    setIsTransitioning(true)
    setDirection(dir)
    setTimeout(() => {
      const newStart = new Date(currentWeekStart)
      newStart.setDate(newStart.getDate() + (dir === 'next' ? 7 : -7))
      setCurrentWeekStart(newStart)
      setIsTransitioning(false)
    }, 150)
  }

  // Navigate to current week
  const goToToday = () => {
    setIsTransitioning(true)
    setDirection('next')
    setTimeout(() => {
      setCurrentWeekStart(getWeekStart(today))
      setIsTransitioning(false)
    }, 150)
  }

  // Month data
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]

  // Get available months (current month and future months in current year)
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const availableMonths = months
    .map((month, index) => ({ name: month, index }))
    .filter(({ index }) => index >= currentMonth)

  // Pagination settings
  const MONTHS_PER_PAGE = 6
  const totalPages = Math.ceil(availableMonths.length / MONTHS_PER_PAGE)
  const startIndex = monthPage * MONTHS_PER_PAGE
  const endIndex = startIndex + MONTHS_PER_PAGE
  const visibleMonths = availableMonths.slice(startIndex, endIndex)

  // Handle month selection
  const handleMonthClick = (monthIndex) => {
    const firstDayOfMonth = new Date(currentYear, monthIndex, 1)
    const weekStart = getWeekStart(firstDayOfMonth)
    setCurrentWeekStart(weekStart)
    setShowMonthSelector(false)
    setMonthPage(0) // Reset page when closing
  }

  // Navigate month pages
  const goToNextMonthPage = () => {
    if (monthPage < totalPages - 1) {
      setMonthPage(monthPage + 1)
    }
  }

  const goToPrevMonthPage = () => {
    if (monthPage > 0) {
      setMonthPage(monthPage - 1)
    }
  }

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date)
    if (onDateSelect) {
      onDateSelect(date)
    }
  }

  // Get current week days
  const weekDays = getWeekDays(currentWeekStart)

  // Check if current week contains today
  const isCurrentWeek = weekDays.some(date => isSameDate(date, today))

  // Get month and year for display
  const displayMonth = currentWeekStart.toLocaleString('en-US', { month: 'long' }).toUpperCase()
  const displayYear = currentWeekStart.getFullYear()

  // Day names
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  // Animation for week transition
  const weekTransition = useSpring({
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning
      ? `translateX(${direction === 'next' ? '20px' : '-20px'})`
      : 'translateX(0px)',
    config: { tension: 200, friction: 25 }
  })

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    <div className={className}>
      {/* LCD Screen Widget */}
      <div style={{
        background: 'linear-gradient(135deg, #b8b8b8 0%, #d4d4d4 100%)',
        borderRadius: '20px',
        padding: '24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        color: '#1a1a1a',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
      }}>

        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <div>
            <div
              onClick={() => {
                setMonthPage(0) // Reset to first page when opening
                setShowMonthSelector(!showMonthSelector)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div style={{
                width: '4px',
                height: '20px',
                background: '#1a1a1a',
                borderRadius: '2px'
              }}></div>
              <div style={{
                fontSize: '15px',
                fontWeight: '700',
                letterSpacing: '0.05em'
              }}>{displayMonth}</div>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              lineHeight: 1,
              letterSpacing: '-0.02em'
            }}>{displayYear}</div>
          </div>

          {/* Event Info */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              opacity: 0.6,
              marginBottom: '4px'
            }}>● Today! 21:30</div>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              lineHeight: 1.3,
              letterSpacing: '-0.01em'
            }}>DESIGN CONFERENCE<br />OPENING KEYNOTE</div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          minHeight: '36px'
        }}>
          {/* Previous Week Button - Left Side */}
          <button
            onClick={() => navigateWeek('prev')}
            style={{
              background: 'rgba(0,0,0,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '20px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.2)'
              e.target.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.1)'
              e.target.style.transform = 'scale(1)'
            }}
          >
            ‹
          </button>

          {/* Today Button - Center (only show when not on current week) */}
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'rgba(0,0,0,0.5)',
                letterSpacing: '0.03em',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'rgba(0,0,0,0.7)'
                e.target.style.transform = 'translateX(-50%) scale(1.02)'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(0,0,0,0.5)'
                e.target.style.transform = 'translateX(-50%) scale(1)'
              }}
            >
              Today
            </button>
          )}

          {/* Next Week Button - Right Side */}
          <button
            onClick={() => navigateWeek('next')}
            style={{
              background: 'rgba(0,0,0,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '20px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.2)'
              e.target.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.1)'
              e.target.style.transform = 'scale(1)'
            }}
          >
            ›
          </button>
        </div>

        {/* Horizontal Week Grid */}
        <animated.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '16px',
            marginTop: 'auto',
            ...weekTransition
          }}
        >
          {weekDays.map((date, index) => {
            const isToday = isSameDate(date, today)
            const isSelected = isSameDate(date, selectedDate)

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  padding: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <div style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  opacity: 0.7,
                  marginBottom: '8px'
                }}>{dayNames[index]}</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: isToday ? '700' : '600',
                  position: 'relative',
                  display: 'inline-block',
                  color: isSelected ? '#ff6b4a' : '#1a1a1a'
                }}>
                  {date.getDate()}
                  {isToday && (
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '40px',
                      height: '40px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '50%',
                      pointerEvents: 'none'
                    }}></div>
                  )}
                  {isSelected && !isToday && (
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '40px',
                      height: '40px',
                      background: 'rgba(255, 107, 74, 0.2)',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      zIndex: -1
                    }}></div>
                  )}
                </div>
              </div>
            )
          })}
        </animated.div>

        {/* Month Selector Overlay */}
        {showMonthSelector && (
          <div
            onClick={() => setShowMonthSelector(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #b8b8b8 0%, #d4d4d4 100%)',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '24px',
                letterSpacing: '0.05em',
                color: '#1a1a1a'
              }}>SELECT MONTH</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visibleMonths.map((month, index) => (
                  <div
                    key={month.index}
                    onClick={() => handleMonthClick(month.index)}
                    style={{
                      padding: '16px 20px',
                      background: 'rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '14px',
                      fontWeight: '600',
                      letterSpacing: '0.03em',
                      color: '#1a1a1a',
                      animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)'
                      e.currentTarget.style.transform = 'translateX(0px)'
                    }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(0, 0, 0, 0.1)'
                }}>
                  <button
                    onClick={goToPrevMonthPage}
                    disabled={monthPage === 0}
                    style={{
                      background: monthPage === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.08)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '18px',
                      cursor: monthPage === 0 ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      color: monthPage === 0 ? 'rgba(0, 0, 0, 0.3)' : '#1a1a1a',
                      opacity: monthPage === 0 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (monthPage > 0) {
                        e.target.style.background = 'rgba(0, 0, 0, 0.15)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (monthPage > 0) {
                        e.target.style.background = 'rgba(0, 0, 0, 0.08)'
                      }
                    }}
                  >
                    ‹
                  </button>

                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'rgba(0, 0, 0, 0.5)',
                    letterSpacing: '0.03em'
                  }}>
                    {monthPage + 1} / {totalPages}
                  </div>

                  <button
                    onClick={goToNextMonthPage}
                    disabled={monthPage === totalPages - 1}
                    style={{
                      background: monthPage === totalPages - 1 ? 'transparent' : 'rgba(0, 0, 0, 0.08)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '18px',
                      cursor: monthPage === totalPages - 1 ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      color: monthPage === totalPages - 1 ? 'rgba(0, 0, 0, 0.3)' : '#1a1a1a',
                      opacity: monthPage === totalPages - 1 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (monthPage < totalPages - 1) {
                        e.target.style.background = 'rgba(0, 0, 0, 0.15)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (monthPage < totalPages - 1) {
                        e.target.style.background = 'rgba(0, 0, 0, 0.08)'
                      }
                    }}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  )
}

export default CalendarWidget
