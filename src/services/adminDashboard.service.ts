import { supabase } from '@/lib/supabase'

export type DashboardMetrics = {
  activeAthletes: number
  activeVenues: number
  activeInstructors: number
  activeSchedules: number
  pendingPreregistrations: number
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const [athletes, venues, instructors, schedules, preregistrations] = await Promise.all([
    supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('venues').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('instructors').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('training_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('source', 'web_form'),
  ])

  for (const result of [athletes, venues, instructors, schedules, preregistrations]) {
    if (result.error) throw result.error
  }

  return {
    activeAthletes: athletes.count ?? 0,
    activeVenues: venues.count ?? 0,
    activeInstructors: instructors.count ?? 0,
    activeSchedules: schedules.count ?? 0,
    pendingPreregistrations: preregistrations.count ?? 0,
  }
}

export type RecentRegistration = {
  id: string
  athleteName: string
  venueName: string
  programName: string
  status: string
  source: string
  createdAt: string
}

type RecentRegistrationRow = {
  id: string
  status: string
  source: string
  created_at: string
  athletes: { first_name: string; last_name: string } | null
  training_schedules: {
    venues: { name: string } | null
    programs: { name: string } | null
  } | null
}

export const getRecentRegistrations = async (): Promise<RecentRegistration[]> => {
  const { data, error } = await supabase
    .from('registrations')
    .select(
      `id, status, source, created_at,
       athletes ( first_name, last_name ),
       training_schedules ( venues ( name ), programs ( name ) )`,
    )
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error

  return (data as unknown as RecentRegistrationRow[]).map((row) => ({
    id: row.id,
    athleteName: row.athletes ? `${row.athletes.first_name} ${row.athletes.last_name}` : '—',
    venueName: row.training_schedules?.venues?.name ?? '—',
    programName: row.training_schedules?.programs?.name ?? '—',
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  }))
}
