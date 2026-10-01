import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import type { Venue, VenueProgramLink, VenueProgramStatus } from '@/types/venue'
import type { Program } from '@/types/program'
import type { VenueFormValues } from '@/lib/validations/venue.schema'
import { getSchedules } from '@/services/schedules.service'
import { mapProgram } from '@/services/programs.service'

type VenueRow = Tables<'venues'>

// Convierte una fila de la base (snake_case) al modelo de dominio (camelCase)
export const mapVenue = (row: VenueRow): Venue => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  address: row.address,
  city: row.city,
  description: row.description,
  phone: row.phone,
  whatsapp: row.whatsapp,
  googleMapsUrl: row.google_maps_url,
  latitude: row.latitude,
  longitude: row.longitude,
  imageUrl: row.image_url,
  schedulesPerAthlete: row.schedules_per_athlete,
  isActive: row.is_active,
})

// Sedes activas para el sitio público
export const getVenues = async (): Promise<Venue[]> => {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data.map(mapVenue)
}

// Una sede activa por su slug; null si no existe
export const getVenueBySlug = async (slug: string): Promise<Venue | null> => {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data ? mapVenue(data) : null
}

// Horarios activos de una sede, usado en la página de detalle
export const getSchedulesByVenueId = async (venueId: string) => {
  const schedules = await getSchedules()
  return schedules.filter((s) => s.venueId === venueId)
}

// Programas publicables de una sede (activos y con los horarios que exige la sede),
// en el orden del catálogo
export const getProgramsByVenueId = async (venueId: string): Promise<Program[]> => {
  const [{ data, error }, statusResult] = await Promise.all([
    supabase.from('venue_programs').select('programs ( * )').eq('venue_id', venueId),
    getVenueProgramStatus(),
  ])

  if (error) throw error
  const publishableIds = statusResult
    .filter((st) => st.venueId === venueId && st.isPublishable)
    .map((st) => st.programId)
  return data
    .map((row) => row.programs)
    .filter((program) => program !== null && publishableIds.includes(program.id))
    .map((program) => mapProgram(program!))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

// Todas las sedes, activas e inactivas: solo para el panel admin
export const getAllVenuesForAdmin = async (): Promise<Venue[]> => {
  const { data, error } = await supabase.from('venues').select('*').order('name')
  if (error) throw error
  return data.map(mapVenue)
}

export const getVenueById = async (id: string): Promise<Venue | null> => {
  const { data, error } = await supabase.from('venues').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapVenue(data) : null
}

export const createVenue = async (input: VenueFormValues): Promise<Venue> => {
  const payload: TablesInsert<'venues'> = {
    name: input.name,
    slug: input.slug,
    address: input.address,
    city: input.city || null,
    description: input.description || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    google_maps_url: input.googleMapsUrl || null,
    image_url: input.imageUrl || null,
    schedules_per_athlete: Number(input.schedulesPerAthlete),
    is_active: input.isActive,
  }

  const { data, error } = await supabase.from('venues').insert(payload).select().single()
  if (error) throw error
  return mapVenue(data)
}

export const updateVenue = async (id: string, input: VenueFormValues): Promise<Venue> => {
  const payload: TablesUpdate<'venues'> = {
    name: input.name,
    slug: input.slug,
    address: input.address,
    city: input.city || null,
    description: input.description || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    google_maps_url: input.googleMapsUrl || null,
    image_url: input.imageUrl || null,
    schedules_per_athlete: Number(input.schedulesPerAthlete),
    is_active: input.isActive,
  }

  const { data, error } = await supabase
    .from('venues')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapVenue(data)
}

export const setVenueActive = async (id: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase.from('venues').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

// Todas las relaciones sede-programa, activas e inactivas: solo para el panel admin
export const getVenueProgramLinksForAdmin = async (): Promise<VenueProgramLink[]> => {
  const { data, error } = await supabase
    .from('venue_programs')
    .select('venue_id, program_id, is_active')
  if (error) throw error
  return data.map((row) => ({
    venueId: row.venue_id,
    programId: row.program_id,
    isActive: row.is_active,
  }))
}

// Deja activos en la sede exactamente los programas indicados (los demás se desactivan)
export const setVenuePrograms = async (venueId: string, programIds: string[]): Promise<void> => {
  const { error } = await supabase.rpc('set_venue_programs', {
    p_venue_id: venueId,
    p_program_ids: programIds,
  })
  if (error) throw error
}

// Estado de cada programa en cada sede (horarios activos y si es publicable).
// El público solo recibe lo público; el staff recibe todo.
export const getVenueProgramStatus = async (): Promise<VenueProgramStatus[]> => {
  const { data, error } = await supabase.rpc('get_venue_program_status')
  if (error) throw error
  return (data ?? []).map((row) => ({
    venueId: row.venue_id,
    programId: row.program_id,
    requiredSchedules: row.required_schedules,
    activeSchedules: row.active_schedules,
    isPublishable: row.is_publishable,
  }))
}
