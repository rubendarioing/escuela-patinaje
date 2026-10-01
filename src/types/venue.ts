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
  schedulesPerAthlete: number // horarios exactos que elige un deportista al inscribirse
  isActive: boolean
}

// Relación sede-programa: qué programas ofrece cada sede
export type VenueProgramLink = {
  venueId: string
  programId: string
  isActive: boolean
}

// Estado de un programa en una sede: es publicable en la inscripción cuando
// tiene al menos requiredSchedules horarios activos (y todo está activo)
export type VenueProgramStatus = {
  venueId: string
  programId: string
  requiredSchedules: number
  activeSchedules: number
  isPublishable: boolean
}
