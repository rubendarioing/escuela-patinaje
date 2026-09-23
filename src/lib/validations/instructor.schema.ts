import { z } from 'zod'

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const instructorSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresa el nombre').max(100),
  lastName: z.string().trim().min(1, 'Ingresa el apellido').max(100),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Ingresa un correo válido'),
  phone: z.string().trim().max(30),
  specialty: z.string().trim().max(150),
  bio: z.string().trim().max(2000),
  photoUrl: z.string().trim().max(500),
  isActive: z.boolean(),
})

export type InstructorFormValues = z.infer<typeof instructorSchema>
