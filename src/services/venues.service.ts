import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import type { Venue } from '@/types/venue'

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
