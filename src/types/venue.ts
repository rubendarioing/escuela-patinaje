export type Venue = {
  id: string
  name: string
  slug: string
  address: string
  city: string | null
  description: string | null
  phone: string | null
  whatsapp: string | null
  googleMapsUrl: string | null
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  isActive: boolean
}

// Relación sede-programa: qué programas ofrece cada sede
export type VenueProgramLink = {
  venueId: string
  programId: string
  isActive: boolean
}
