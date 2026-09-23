import { z } from 'zod'

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const venueSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre').max(150),
  slug: z
    .string()
    .trim()
    .min(1, 'Ingresa el slug')
    .max(150)
    .refine(
      (value) => SLUG_REGEX.test(value),
      'Usa minúsculas, números y guiones (sin espacios ni tildes)',
    ),
  address: z.string().trim().min(1, 'Ingresa la dirección').max(200),
  city: z.string().trim().max(100),
  description: z.string().trim().max(1000),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  googleMapsUrl: z.string().trim().max(500),
  imageUrl: z.string().trim().max(500),
  isActive: z.boolean(),
})

export type VenueFormValues = z.infer<typeof venueSchema>
