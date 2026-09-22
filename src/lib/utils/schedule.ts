export const DAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

// Convierte "15:00:00" a "3:00 p. m."
export const formatTime = (time: string): string => {
  const [hoursStr, minutesStr] = time.split(':')
  const hours = Number(hoursStr)
  const period = hours >= 12 ? 'p. m.' : 'a. m.'
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12
  const minutesLabel = minutesStr === '00' ? '' : `:${minutesStr}`
  return `${twelveHour}${minutesLabel} ${period}`
}

export const formatScheduleRange = (startTime: string, endTime: string): string =>
  `${formatTime(startTime)} – ${formatTime(endTime)}`
