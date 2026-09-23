import { z } from 'zod'

export const ATHLETE_STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospecto' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'withdrawn', label: 'Retirado' },
]

export const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({
  value: v,
  label: v,
}))

const STATUS_VALUES = ATHLETE_STATUS_OPTIONS.map((o) => o.value)
const BLOOD_TYPE_VALUES = ['', ...BLOOD_TYPE_OPTIONS.map((o) => o.value)]

export const athleteSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Ingresa el nombre').max(100),
    lastName: z.string().trim().min(1, 'Ingresa el apellido').max(100),
    documentType: z.string(),
    documentNumber: z.string().trim().max(50),
    birthDate: z
      .string()
      .min(1, 'Ingresa la fecha de nacimiento')
      .refine((v) => {
        const d = new Date(v)
        const now = new Date()
        const min = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate())
        return !Number.isNaN(d.getTime()) && d <= now && d >= min
      }, 'Ingresa una fecha de nacimiento válida'),
    gender: z.string().trim().max(30),
    bloodType: z.string().refine((v) => BLOOD_TYPE_VALUES.includes(v), 'Tipo de sangre no válido'),
    notes: z.string().trim().max(1000),
    status: z.string().refine((v) => STATUS_VALUES.includes(v), 'Estado no válido'),
  })
  .refine((data) => (data.documentType === '') === (data.documentNumber === ''), {
    message: 'Completa el tipo y el número de documento juntos, o deja ambos vacíos',
    path: ['documentNumber'],
  })

export type AthleteFormValues = z.infer<typeof athleteSchema>
