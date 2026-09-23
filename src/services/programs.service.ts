import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import type { ProgramFormValues } from '@/lib/validations/program.schema'
import type { Program } from '@/types/program'
import { getSchedules } from '@/services/schedules.service'

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
  const schedules = await getSchedules()
  return schedules.filter((s) => s.programId === programId)
}

const toNullableInt = (value: string): number | null => (value === '' ? null : Number(value))

// Todos los programas, activos e inactivos: solo para el panel admin
export const getAllProgramsForAdmin = async (): Promise<Program[]> => {
  const { data, error } = await supabase.from('programs').select('*').order('sort_order')
  if (error) throw error
  return data.map(mapProgram)
}

export const getProgramById = async (id: string): Promise<Program | null> => {
  const { data, error } = await supabase.from('programs').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapProgram(data) : null
}

export const createProgram = async (input: ProgramFormValues): Promise<Program> => {
  const payload: TablesInsert<'programs'> = {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    level: input.level || null,
    min_age: toNullableInt(input.minAge),
    max_age: toNullableInt(input.maxAge),
    sort_order: input.sortOrder === '' ? 0 : Number(input.sortOrder),
    image_url: input.imageUrl || null,
    is_active: input.isActive,
  }

  const { data, error } = await supabase.from('programs').insert(payload).select().single()
  if (error) throw error
  return mapProgram(data)
}

export const updateProgram = async (id: string, input: ProgramFormValues): Promise<Program> => {
  const payload: TablesUpdate<'programs'> = {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    level: input.level || null,
    min_age: toNullableInt(input.minAge),
    max_age: toNullableInt(input.maxAge),
    sort_order: input.sortOrder === '' ? 0 : Number(input.sortOrder),
    image_url: input.imageUrl || null,
    is_active: input.isActive,
  }

  const { data, error } = await supabase
    .from('programs')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapProgram(data)
}

export const setProgramActive = async (id: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase.from('programs').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}
