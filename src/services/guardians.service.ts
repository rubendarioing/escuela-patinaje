import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import type { GuardianFormValues } from '@/lib/validations/guardian.schema'

export type Guardian = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  source: 'admin' | 'web_form'
  dataConsentAt: string | null
  dataConsentVersion: string | null
  createdAt: string
}

const mapGuardian = (row: Tables<'guardians'>): Guardian => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  whatsapp: row.whatsapp,
  source: row.source as Guardian['source'],
  dataConsentAt: row.data_consent_at,
  dataConsentVersion: row.data_consent_version,
  createdAt: row.created_at,
})

export type GuardianListItem = Guardian & {
  athleteNames: string[]
}

type GuardianListRow = Tables<'guardians'> & {
  athlete_guardians: { athletes: { first_name: string; last_name: string } | null }[]
}

export const getAllGuardiansForAdmin = async (): Promise<GuardianListItem[]> => {
  const { data, error } = await supabase
    .from('guardians')
    .select('*, athlete_guardians ( athletes ( first_name, last_name ) )')
    .order('last_name')

  if (error) throw error

  return (data as unknown as GuardianListRow[]).map((row) => ({
    ...mapGuardian(row),
    athleteNames: row.athlete_guardians
      .filter((ag) => ag.athletes !== null)
      .map((ag) => `${ag.athletes!.first_name} ${ag.athletes!.last_name}`),
  }))
}

export const getGuardianById = async (id: string): Promise<Guardian | null> => {
  const { data, error } = await supabase.from('guardians').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapGuardian(data) : null
}

export const createGuardian = async (input: GuardianFormValues): Promise<Guardian> => {
  const payload: TablesInsert<'guardians'> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    source: 'admin',
  }

  const { data, error } = await supabase.from('guardians').insert(payload).select().single()
  if (error) throw error
  return mapGuardian(data)
}

export const updateGuardian = async (id: string, input: GuardianFormValues): Promise<Guardian> => {
  const payload: TablesUpdate<'guardians'> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
  }

  const { data, error } = await supabase
    .from('guardians')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapGuardian(data)
}
