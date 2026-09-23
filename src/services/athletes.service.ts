import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import type { Athlete } from '@/types/athlete'
import type { AthleteFormValues } from '@/lib/validations/athlete.schema'

const mapAthlete = (row: Tables<'athletes'>): Athlete => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  documentType: row.document_type,
  documentNumber: row.document_number,
  birthDate: row.birth_date,
  gender: row.gender,
  bloodType: row.blood_type,
  notes: row.notes,
  status: row.status as Athlete['status'],
  source: row.source as Athlete['source'],
  createdAt: row.created_at,
})

export type DocumentType = { code: string; name: string }

export const getDocumentTypes = async (): Promise<DocumentType[]> => {
  const { data, error } = await supabase
    .from('document_types')
    .select('code, name')
    .order('sort_order')
  if (error) throw error
  return data
}

// ---- Listado ----

export type AthleteListItem = Athlete & {
  currentVenueName: string | null
  currentProgramName: string | null
}

type RegistrationForListRow = {
  status: string
  training_schedules: {
    venues: { name: string } | null
    programs: { name: string } | null
  } | null
}

type AthleteListRow = Tables<'athletes'> & { registrations: RegistrationForListRow[] }

const pickCurrentRegistration = (regs: RegistrationForListRow[]) => {
  const priority = (status: string) =>
    status === 'active' ? 0 : status === 'confirmed' ? 1 : status === 'pending' ? 2 : 3
  return [...regs].sort((a, b) => priority(a.status) - priority(b.status))[0] ?? null
}

export const getAllAthletesForAdmin = async (): Promise<AthleteListItem[]> => {
  const { data, error } = await supabase
    .from('athletes')
    .select(
      '*, registrations ( status, training_schedules ( venues ( name ), programs ( name ) ) )',
    )
    .order('last_name')

  if (error) throw error

  return (data as unknown as AthleteListRow[]).map((row) => {
    const current = pickCurrentRegistration(row.registrations)
    return {
      ...mapAthlete(row),
      currentVenueName: current?.training_schedules?.venues?.name ?? null,
      currentProgramName: current?.training_schedules?.programs?.name ?? null,
    }
  })
}

// ---- Formulario (crear / editar) ----

export const getAthleteById = async (id: string): Promise<Athlete | null> => {
  const { data, error } = await supabase.from('athletes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapAthlete(data) : null
}

export const createAthlete = async (input: AthleteFormValues): Promise<Athlete> => {
  const payload: TablesInsert<'athletes'> = {
    first_name: input.firstName,
    last_name: input.lastName,
    document_type: input.documentType || null,
    document_number: input.documentNumber || null,
    birth_date: input.birthDate,
    gender: input.gender || null,
    blood_type: input.bloodType || null,
    notes: input.notes || null,
    status: input.status,
    source: 'admin',
  }

  const { data, error } = await supabase.from('athletes').insert(payload).select().single()
  if (error) throw error
  return mapAthlete(data)
}

export const updateAthlete = async (id: string, input: AthleteFormValues): Promise<Athlete> => {
  const payload: TablesUpdate<'athletes'> = {
    first_name: input.firstName,
    last_name: input.lastName,
    document_type: input.documentType || null,
    document_number: input.documentNumber || null,
    birth_date: input.birthDate,
    gender: input.gender || null,
    blood_type: input.bloodType || null,
    notes: input.notes || null,
    status: input.status,
  }

  const { data, error } = await supabase
    .from('athletes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapAthlete(data)
}

// ---- Detalle (solo lectura por ahora: acudientes e inscripciones) ----

export type AthleteGuardianLink = {
  guardianId: string
  firstName: string
  lastName: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  relationship: string
  isPrimary: boolean
}

export type AthleteRegistrationHistoryItem = {
  id: string
  status: string
  source: string
  registrationDate: string
  venueName: string | null
  programName: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type AthleteDetail = {
  athlete: Athlete
  documentTypeName: string | null
  guardians: AthleteGuardianLink[]
  registrations: AthleteRegistrationHistoryItem[]
}

type AthleteWithDocTypeRow = Tables<'athletes'> & { document_types: { name: string } | null }

type GuardianLinkRow = {
  relationship: string
  is_primary: boolean
  guardians: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    whatsapp: string | null
    email: string | null
  } | null
}

type RegistrationHistoryRow = {
  id: string
  status: string
  source: string
  registration_date: string
  training_schedules: {
    day_of_week: number
    start_time: string
    end_time: string
    venues: { name: string } | null
    programs: { name: string } | null
  } | null
}

export const getAthleteDetail = async (id: string): Promise<AthleteDetail | null> => {
  const { data: athleteRow, error: athleteError } = await supabase
    .from('athletes')
    .select('*, document_types ( name )')
    .eq('id', id)
    .maybeSingle()

  if (athleteError) throw athleteError
  if (!athleteRow) return null

  const [guardiansResult, registrationsResult] = await Promise.all([
    supabase
      .from('athlete_guardians')
      .select(
        'relationship, is_primary, guardians ( id, first_name, last_name, phone, whatsapp, email )',
      )
      .eq('athlete_id', id),
    supabase
      .from('registrations')
      .select(
        'id, status, source, registration_date, training_schedules ( day_of_week, start_time, end_time, venues ( name ), programs ( name ) )',
      )
      .eq('athlete_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (guardiansResult.error) throw guardiansResult.error
  if (registrationsResult.error) throw registrationsResult.error

  const athleteData = athleteRow as unknown as AthleteWithDocTypeRow

  return {
    athlete: mapAthlete(athleteData),
    documentTypeName: athleteData.document_types?.name ?? null,
    guardians: (guardiansResult.data as unknown as GuardianLinkRow[])
      .filter((g) => g.guardians !== null)
      .map((g) => ({
        guardianId: g.guardians!.id,
        firstName: g.guardians!.first_name,
        lastName: g.guardians!.last_name,
        phone: g.guardians!.phone,
        whatsapp: g.guardians!.whatsapp,
        email: g.guardians!.email,
        relationship: g.relationship,
        isPrimary: g.is_primary,
      })),
    registrations: (registrationsResult.data as unknown as RegistrationHistoryRow[]).map((r) => ({
      id: r.id,
      status: r.status,
      source: r.source,
      registrationDate: r.registration_date,
      venueName: r.training_schedules?.venues?.name ?? null,
      programName: r.training_schedules?.programs?.name ?? null,
      dayOfWeek: r.training_schedules?.day_of_week ?? 0,
      startTime: r.training_schedules?.start_time ?? '',
      endTime: r.training_schedules?.end_time ?? '',
    })),
  }
}
