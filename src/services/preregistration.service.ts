import { supabase } from '@/lib/supabase'

export type PreregistrationPayload = {
  athlete_first_name: string
  athlete_last_name: string
  athlete_birth_date: string
  guardian_first_name: string
  guardian_last_name: string
  guardian_phone: string
  guardian_whatsapp: string
  guardian_email: string
  schedule_id: string
  notes: string
  consent_accepted: boolean
  consent_version: string
  website: string
}

export type PreregistrationResult = {
  ok: boolean
  code?: string
}

export const submitPreregistration = async (
  payload: PreregistrationPayload,
): Promise<PreregistrationResult> => {
  const { data, error } = await supabase.rpc('submit_preregistration', { payload })
  if (error) throw error
  return data as PreregistrationResult
}
