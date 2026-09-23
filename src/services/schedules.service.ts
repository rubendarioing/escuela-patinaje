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

export type ScheduleAvailability = {
  scheduleId: string
  maxCapacity: number
  enrolledCount: number
  availableSpots: number
}

// Cupos disponibles por horario, calculados por la función RPC (paso 30).
// No requiere leer registrations directamente: la función lo hace por dentro.
export const getScheduleAvailability = async (): Promise<ScheduleAvailability[]> => {
  const { data, error } = await supabase.rpc('get_schedule_availability')
  if (error) throw error

  return (data ?? []).map((row) => ({
    scheduleId: row.schedule_id,
    maxCapacity: row.max_capacity,
    enrolledCount: row.enrolled_count,
    availableSpots: row.available_spots,
  }))
}

// Horarios ordenados por cercanía a partir de hoy (son recurrentes semanales, no tienen fecha fija)
const jsDayToOurDay = (jsDay: number) => (jsDay === 0 ? 7 : jsDay)

export const getUpcomingSchedules = async (limit = 5): Promise<Schedule[]> => {
  const schedules = await getSchedules()
  const today = jsDayToOurDay(new Date().getDay())

  return schedules
    .map((schedule) => ({ schedule, daysUntil: (schedule.dayOfWeek - today + 7) % 7 }))
    .sort(
      (a, b) =>
        a.daysUntil - b.daysUntil || a.schedule.startTime.localeCompare(b.schedule.startTime),
    )
    .slice(0, limit)
    .map((x) => x.schedule)
}

// ---- A partir de aquí: solo para el panel admin ----

export const getAllSchedulesForAdmin = async (): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('training_schedules')
    .select(SCHEDULE_SELECT)
    .order('day_of_week')
    .order('start_time')

  if (error) throw error
  return (data as unknown as ScheduleWithRelationsRow[]).map(mapSchedule)
}

export const setScheduleActive = async (id: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase
    .from('training_schedules')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

export type ScheduleDetail = {
  id: string
  venueId: string
  programId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxCapacity: number
  isActive: boolean
  leadInstructorId: string | null
  assistantInstructorIds: string[]
}

type ScheduleDetailRow = {
  id: string
  venue_id: string
  program_id: string
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number
  is_active: boolean
  schedule_instructors: { instructor_id: string; role: string }[]
}

// Detalle completo de un horario (con instructor principal y auxiliares), para el formulario de edición
export const getScheduleDetailById = async (id: string): Promise<ScheduleDetail | null> => {
  const { data, error } = await supabase
    .from('training_schedules')
    .select(
      'id, venue_id, program_id, day_of_week, start_time, end_time, max_capacity, is_active, schedule_instructors ( instructor_id, role )',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as ScheduleDetailRow
  const lead = row.schedule_instructors.find((r) => r.role === 'lead')?.instructor_id ?? null
  const assistants = row.schedule_instructors
    .filter((r) => r.role === 'assistant')
    .map((r) => r.instructor_id)

  return {
    id: row.id,
    venueId: row.venue_id,
    programId: row.program_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    maxCapacity: row.max_capacity,
    isActive: row.is_active,
    leadInstructorId: lead,
    assistantInstructorIds: assistants,
  }
}

export type InstructorAssignment = {
  scheduleId: string
  instructorId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

type InstructorAssignmentRow = {
  instructor_id: string
  training_schedules: {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
  } | null
}

// Todas las asignaciones de instructores en horarios activos, para detectar cruces de horario
export const getInstructorAssignments = async (): Promise<InstructorAssignment[]> => {
  const { data, error } = await supabase
    .from('schedule_instructors')
    .select(
      'instructor_id, training_schedules ( id, day_of_week, start_time, end_time, is_active )',
    )

  if (error) throw error

  return (data as unknown as InstructorAssignmentRow[])
    .filter((row) => row.training_schedules?.is_active)
    .map((row) => ({
      scheduleId: row.training_schedules!.id,
      instructorId: row.instructor_id,
      dayOfWeek: row.training_schedules!.day_of_week,
      startTime: row.training_schedules!.start_time,
      endTime: row.training_schedules!.end_time,
    }))
}

export type ScheduleSavePayload = {
  id?: string
  venueId: string
  programId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxCapacity: number
  isActive: boolean
  leadInstructorId: string | null
  assistantInstructorIds: string[]
}

// Guarda el horario y sincroniza sus instructores en una sola operación atómica
export const saveTrainingSchedule = async (input: ScheduleSavePayload): Promise<string> => {
  const { data, error } = await supabase.rpc('save_training_schedule', {
    payload: {
      id: input.id ?? null,
      venue_id: input.venueId,
      program_id: input.programId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      max_capacity: input.maxCapacity,
      is_active: input.isActive,
      lead_instructor_id: input.leadInstructorId,
      assistant_instructor_ids: input.assistantInstructorIds,
    },
  })

  if (error) throw error
  return data as string
}
