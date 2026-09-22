import { supabase } from '@/lib/supabase'
import type { Schedule } from '@/types/schedule'

type ScheduleWithRelationsRow = {
  id: string
  venue_id: string
  program_id: string
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number
  is_active: boolean
  venues: { id: string; name: string; slug: string } | null
  programs: {
    id: string
    name: string
    slug: string
    min_age: number | null
    max_age: number | null
  } | null
  schedule_instructors: {
    role: string
    instructors: { id: string; first_name: string; last_name: string } | null
  }[]
}

export const mapSchedule = (row: ScheduleWithRelationsRow): Schedule => {
  const lead = row.schedule_instructors.find((si) => si.role === 'lead')?.instructors ?? null

  return {
    id: row.id,
    venueId: row.venue_id,
    programId: row.program_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    maxCapacity: row.max_capacity,
    isActive: row.is_active,
    venue: row.venues,
    program: row.programs
      ? {
          id: row.programs.id,
          name: row.programs.name,
          slug: row.programs.slug,
          minAge: row.programs.min_age,
          maxAge: row.programs.max_age,
        }
      : null,
    leadInstructor: lead
      ? { id: lead.id, firstName: lead.first_name, lastName: lead.last_name }
      : null,
  }
}

const SCHEDULE_SELECT = `
  id, venue_id, program_id, day_of_week, start_time, end_time, max_capacity, is_active,
  venues ( id, name, slug ),
  programs ( id, name, slug, min_age, max_age ),
  schedule_instructors ( role, instructors ( id, first_name, last_name ) )
`

export const getSchedules = async (): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('training_schedules')
    .select(SCHEDULE_SELECT)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  if (error) throw error
  return (data as unknown as ScheduleWithRelationsRow[]).map(mapSchedule)
}

export const getSchedulesByVenueSlug = async (venueSlug: string): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('training_schedules')
    .select(SCHEDULE_SELECT)
    .eq('is_active', true)
    .eq('venues.slug', venueSlug)
    .order('day_of_week')
    .order('start_time')

  if (error) throw error
  return (data as unknown as ScheduleWithRelationsRow[])
    .filter((row) => row.venues !== null)
    .map(mapSchedule)
}
