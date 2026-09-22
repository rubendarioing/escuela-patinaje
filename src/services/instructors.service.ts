import { supabase } from '@/lib/supabase'
import type { Instructor } from '@/types/instructor'

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
