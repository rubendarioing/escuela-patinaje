import { supabase } from '@/lib/supabase'
import type { Instructor, InstructorProgramLink } from '@/types/instructor'

// Fila pública: solo las columnas que el público tiene permitido leer (paso 14).
// No usa Tables<'instructors'> porque ese tipo incluye email y phone.
type PublicInstructorRow = {
  id: string
  first_name: string
  last_name: string
  specialty: string | null
  bio: string | null
  photo_url: string | null
  is_active: boolean
}

export const mapInstructor = (row: PublicInstructorRow): Instructor => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  specialty: row.specialty,
  bio: row.bio,
  photoUrl: row.photo_url,
  isActive: row.is_active,
})

// Instructores activos, visibles para el público.
// Columnas explícitas: select('*') falla para el rol anon (grants por columna, D10).
export const getInstructors = async (): Promise<Instructor[]> => {
  const { data, error } = await supabase
    .from('instructors')
    .select('id, first_name, last_name, specialty, bio, photo_url, is_active')
    .eq('is_active', true)
    .order('last_name')

  if (error) throw error
  return (data as PublicInstructorRow[]).map(mapInstructor)
}

// ---- A partir de aquí: solo para el panel admin ----
// AdminInstructor sí incluye email y phone, porque el staff tiene permiso
// completo sobre la tabla (a diferencia del público, ver D10 en el paso 14).

import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import type { InstructorFormValues } from '@/lib/validations/instructor.schema'

export type AdminInstructor = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
}

type InstructorRow = Tables<'instructors'>

const mapAdminInstructor = (row: InstructorRow): AdminInstructor => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  specialty: row.specialty,
  bio: row.bio,
  photoUrl: row.photo_url,
  isActive: row.is_active,
})

export const getAllInstructorsForAdmin = async (): Promise<AdminInstructor[]> => {
  const { data, error } = await supabase.from('instructors').select('*').order('last_name')
  if (error) throw error
  return data.map(mapAdminInstructor)
}

export const getInstructorById = async (id: string): Promise<AdminInstructor | null> => {
  const { data, error } = await supabase.from('instructors').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapAdminInstructor(data) : null
}

export const createInstructor = async (input: InstructorFormValues): Promise<AdminInstructor> => {
  const payload: TablesInsert<'instructors'> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    specialty: input.specialty || null,
    bio: input.bio || null,
    photo_url: input.photoUrl || null,
    is_active: input.isActive,
  }

  const { data, error } = await supabase.from('instructors').insert(payload).select().single()
  if (error) throw error
  return mapAdminInstructor(data)
}

export const updateInstructor = async (
  id: string,
  input: InstructorFormValues,
): Promise<AdminInstructor> => {
  const payload: TablesUpdate<'instructors'> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    specialty: input.specialty || null,
    bio: input.bio || null,
    photo_url: input.photoUrl || null,
    is_active: input.isActive,
  }

  const { data, error } = await supabase
    .from('instructors')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapAdminInstructor(data)
}

export const setInstructorActive = async (id: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase.from('instructors').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

// Todas las relaciones instructor-programa: solo para el panel admin
export const getInstructorProgramLinksForAdmin = async (): Promise<InstructorProgramLink[]> => {
  const { data, error } = await supabase
    .from('instructor_programs')
    .select('instructor_id, program_id')
  if (error) throw error
  return data.map((row) => ({ instructorId: row.instructor_id, programId: row.program_id }))
}

// Deja al instructor exactamente en los programas indicados
export const setInstructorPrograms = async (
  instructorId: string,
  programIds: string[],
): Promise<void> => {
  const { error } = await supabase.rpc('set_instructor_programs', {
    p_instructor_id: instructorId,
    p_program_ids: programIds,
  })
  if (error) throw error
}

// Cuántos horarios (activos o no) tiene asignados el instructor en cada programa.
// Un programa con horarios asignados no se le puede quitar.
export const getAssignedScheduleCountByProgram = async (
  instructorId: string,
): Promise<Map<string, number>> => {
  const { data, error } = await supabase
    .from('schedule_instructors')
    .select('training_schedules ( program_id )')
    .eq('instructor_id', instructorId)
  if (error) throw error

  const counts = new Map<string, number>()
  data.forEach((row) => {
    const programId = row.training_schedules?.program_id
    if (programId) counts.set(programId, (counts.get(programId) ?? 0) + 1)
  })
  return counts
}
