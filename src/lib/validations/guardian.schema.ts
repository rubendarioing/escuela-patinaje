import { z } from 'zod'

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const guardianSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Ingresa el nombre').max(100),
    lastName: z.string().trim().min(1, 'Ingresa el apellido').max(100),
    phone: z.string().trim().max(30),
    whatsapp: z.string().trim().max(30),
    email: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Ingresa un correo válido'),
  })
  .refine((data) => Boolean(data.phone || data.whatsapp || data.email), {
    message: 'Ingresa al menos un medio de contacto (teléfono, WhatsApp o correo)',
    path: ['phone'],
  })

export type GuardianFormValues = z.infer<typeof guardianSchema>
