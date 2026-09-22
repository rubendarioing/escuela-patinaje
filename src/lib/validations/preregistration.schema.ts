import { z } from 'zod'

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const preregistrationSchema = z
  .object({
    athleteFirstName: z.string().trim().min(1, 'Ingresa el nombre del deportista').max(100),
    athleteLastName: z.string().trim().min(1, 'Ingresa el apellido del deportista').max(100),
    athleteBirthDate: z
      .string()
      .min(1, 'Ingresa la fecha de nacimiento')
      .refine((value) => {
        const date = new Date(value)
        const now = new Date()
        const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate())
        return !Number.isNaN(date.getTime()) && date <= now && date >= minDate
      }, 'Ingresa una fecha de nacimiento válida'),
    guardianFirstName: z.string().trim().min(1, 'Ingresa el nombre del acudiente').max(100),
    guardianLastName: z.string().trim().min(1, 'Ingresa el apellido del acudiente').max(100),
    guardianPhone: z.string().trim().max(30),
    guardianWhatsapp: z.string().trim().max(30),
    guardianEmail: z
      .string()
      .trim()
      .max(200)
      .refine((value) => value === '' || EMAIL_REGEX.test(value), 'Ingresa un correo válido'),
    scheduleId: z.string().min(1, 'Elige un horario'),
    notes: z.string().trim().max(1000),
    consentAccepted: z.boolean().refine((value) => value === true, {
      message: 'Debes aceptar el tratamiento de datos',
    }),
    website: z.string(),
  })
  .refine((data) => Boolean(data.guardianPhone || data.guardianWhatsapp || data.guardianEmail), {
    message: 'Ingresa al menos un medio de contacto (teléfono, WhatsApp o correo)',
    path: ['guardianPhone'],
  })

export type PreregistrationFormValues = z.infer<typeof preregistrationSchema>
