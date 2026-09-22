export type Schedule = {
  id: string
  venueId: string
  programId: string
  dayOfWeek: number // 1 = lunes ... 7 = domingo
  startTime: string
  endTime: string
  maxCapacity: number
  isActive: boolean
  venue: { id: string; name: string; slug: string } | null
  program: { id: string; name: string; slug: string } | null
  leadInstructor: { id: string; firstName: string; lastName: string } | null
}
