import { supabase } from '@/lib/supabase'

export const REGISTRATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'active', label: 'Activa' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'completed', label: 'Finalizada' },
]

export type RegistrationListItem = {
  id: string
  athleteId: string
  athleteName: string
  scheduleId: string
  programId: string
  programName: string
  venueId: string
  venueName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  registrationDate: string
  status: string
  source: string
}

type RegistrationRow = {
  id: string
  registration_date: string
  status: string
  source: string
  athletes: { id: string; first_name: string; last_name: string } | null
  training_schedules: {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    venues: { id: string; name: string } | null
    programs: { id: string; name: string } | null
  } | null
}

const REGISTRATION_SELECT = `
  id, registration_date, status, source,
  athletes ( id, first_name, last_name ),
  training_schedules ( id, day_of_week, start_time, end_time,
    venues ( id, name ), programs ( id, name ) )
`

const mapRegistration = (row: RegistrationRow): RegistrationListItem => ({
  id: row.id,
  athleteId: row.athletes?.id ?? '',
  athleteName: row.athletes ? `${row.athletes.first_name} ${row.athletes.last_name}` : '—',
  scheduleId: row.training_schedules?.id ?? '',
  programId: row.training_schedules?.programs?.id ?? '',
  programName: row.training_schedules?.programs?.name ?? '—',
  venueId: row.training_schedules?.venues?.id ?? '',
  venueName: row.training_schedules?.venues?.name ?? '—',
  dayOfWeek: row.training_schedules?.day_of_week ?? 0,
  startTime: row.training_schedules?.start_time ?? '',
  endTime: row.training_schedules?.end_time ?? '',
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
