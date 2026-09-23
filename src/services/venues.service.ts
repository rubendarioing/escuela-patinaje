import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import type { Venue } from '@/types/venue'
import type { VenueFormValues } from '@/lib/validations/venue.schema'

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
  const { getSchedules } = await import('@/services/schedules.service')
  const schedules = await getSchedules()
  return schedules.filter((s) => s.venueId === venueId)
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
