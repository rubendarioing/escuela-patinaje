import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import type { Program } from '@/types/program'

type ProgramRow = Tables<'programs'>

export const mapProgram = (row: ProgramRow): Program => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  level: row.level as Program['level'],
  minAge: row.min_age,
  maxAge: row.max_age,
  sortOrder: row.sort_order,
  imageUrl: row.image_url,
  isActive: row.is_active,
})

// Programas activos, ordenados para el sitio público
export const getPrograms = async (): Promise<Program[]> => {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error
  return data.map(mapProgram)
}

export const getProgramBySlug = async (slug: string): Promise<Program | null> => {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data ? mapProgram(data) : null
}

// Horarios activos de un programa, usado en la página de detalle
export const getSchedulesByProgramId = async (programId: string) => {
  const { getSchedules } = await import('@/services/schedules.service')
  const schedules = await getSchedules()
  return schedules.filter((s) => s.programId === programId)
}
