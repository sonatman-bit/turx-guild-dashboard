export const DAYS_OF_WEEK = [
  { key: 'pzt', label: 'PZT', name: 'Pazartesi' },
  { key: 'sal', label: 'SAL', name: 'Salı' },
  { key: 'car', label: 'ÇAR', name: 'Çarşamba' },
  { key: 'per', label: 'PER', name: 'Perşembe' },
  { key: 'cum', label: 'CUM', name: 'Cuma' },
  { key: 'cmt', label: 'CMT', name: 'Cumartesi' },
  { key: 'paz', label: 'PAZ', name: 'Pazar' },
] as const

export type ValidDayKey = (typeof DAYS_OF_WEEK)[number]['key']
export type AvailabilityStatus = 'busy' | 'available' | 'maybe'

export type DayAvailability = {
  status: AvailabilityStatus
  startTime: string
  endTime: string
}

export type WeekAvailability = Record<ValidDayKey, DayAvailability>

export const DEFAULT_START_TIME = '21:00'
export const DEFAULT_END_TIME = '00:00'

export function defaultDayAvailability(): DayAvailability {
  return {
    status: 'busy',
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
  }
}

export function defaultWeekAvailability(): WeekAvailability {
  return {
    pzt: defaultDayAvailability(),
    sal: defaultDayAvailability(),
    car: defaultDayAvailability(),
    per: defaultDayAvailability(),
    cum: defaultDayAvailability(),
    cmt: defaultDayAvailability(),
    paz: defaultDayAvailability(),
  }
}

export function normalizeAvailability(raw: unknown): WeekAvailability & { crs?: DayAvailability } {
  const result = defaultWeekAvailability()
  if (!raw || typeof raw !== 'object') {
    return { ...result, crs: { ...result.car } }
  }

  const map = raw as Record<string, { status?: string; startTime?: string; endTime?: string }>

  for (const day of DAYS_OF_WEEK) {
    const key = day.key
    // Support legacy 'crs' key for Wednesday
    const item = map[key] || (key === 'car' ? map['crs'] : undefined)
    if (item && typeof item === 'object') {
      const st = item.status
      const validStatus: AvailabilityStatus =
        st === 'available' || st === 'maybe' || st === 'busy' ? st : 'busy'

      result[key] = {
        status: validStatus,
        startTime: typeof item.startTime === 'string' && item.startTime.trim() ? item.startTime.trim() : DEFAULT_START_TIME,
        endTime: typeof item.endTime === 'string' && item.endTime.trim() ? item.endTime.trim() : DEFAULT_END_TIME,
      }
    } else {
      result[key] = defaultDayAvailability()
    }
  }

  return {
    ...result,
    crs: { ...result.car }, // alias for backward compatibility with attendance route
  }
}
