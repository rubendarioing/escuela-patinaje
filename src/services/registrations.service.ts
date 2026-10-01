import { supabase } from '@/lib/supabase'

export const REGISTRATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'active', label: 'Activa' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'completed', label: 'Finalizada' },
]

// Un horario dentro de una inscripción
export type RegistrationScheduleItem = {
  scheduleId: string
  programId: string
  programName: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

// Una inscripción: un deportista en una sede con sus N horarios
export type RegistrationListItem = {
  id: string
  athleteId: string
  athleteName: string
  venueId: string
  venueName: string
  requiredSchedules: number
  schedules: RegistrationScheduleItem[]
  registrationDate: string
  status: string
  source: string
}

type RegistrationRow = {
  id: string
  registration_date: string
  status: string
  source: string
  required_schedules: number
  athletes: { id: string; first_name: string; last_name: string } | null
  venues: { id: string; name: string } | null
  registration_schedules: {
    training_schedules: {
      id: string
      day_of_week: number
      start_time: string
      end_time: string
      programs: { id: string; name: string } | null
    } | null
  }[]
}

const REGISTRATION_SELECT = `
  id, registration_date, status, source, required_schedules,
  athletes ( id, first_name, last_name ),
  venues ( id, name ),
  registration_schedules ( training_schedules ( id, day_of_week, start_time, end_time,
    programs ( id, name ) ) )
`

const mapRegistration = (row: RegistrationRow): RegistrationListItem => ({
  id: row.id,
  athleteId: row.athletes?.id ?? '',
  athleteName: row.athletes ? `${row.athletes.first_name} ${row.athletes.last_name}` : '—',
  venueId: row.venues?.id ?? '',
  venueName: row.venues?.name ?? '—',
  requiredSchedules: row.required_schedules,
  schedules: row.registration_schedules
    .map((rs) => rs.training_schedules)
    .filter((s) => s !== null)
    .map((s) => ({
      scheduleId: s!.id,
      programId: s!.programs?.id ?? '',
      programName: s!.programs?.name ?? '—',
      dayOfWeek: s!.day_of_week,
      startTime: s!.start_time,
      endTime: s!.end_time,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
  registrationDate: row.registration_date,
  status: row.status,
  source: row.source,
})

export const getAllRegistrationsForAdmin = async (): Promise<RegistrationListItem[]> => {
  const { data, error } = await supabase
    .from('registrations')
    .select(REGISTRATION_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as RegistrationRow[]).map(mapRegistration)
}

export const setRegistrationStatus = async (id: string, status: string): Promise<void> => {
  const { error } = await supabase.from('registrations').update({ status }).eq('id', id)
  if (error) throw error
}
