import { z } from 'zod'

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const AGE_REGEX = /^\d{1,3}$/

export const PROGRAM_LEVEL_OPTIONS = [
  { value: 'initiation', label: 'Iniciación' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'competition', label: 'Competencia' },
]

const LEVEL_VALUES = ['', ...PROGRAM_LEVEL_OPTIONS.map((o) => o.value)]

export const programSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresa el nombre').max(150),
    slug: z
      .string()
      .trim()
      .min(1, 'Ingresa el slug')
      .max(150)
      .refine(
        (v) => SLUG_REGEX.test(v),
        'Usa minúsculas, números y guiones (sin espacios ni tildes)',
      ),
    description: z.string().trim().max(1000),
    level: z.string().refine((v) => LEVEL_VALUES.includes(v), 'Nivel no válido'),
    minAge: z
      .string()
      .trim()
      .refine((v) => v === '' || AGE_REGEX.test(v), 'Ingresa una edad válida'),
    maxAge: z
      .string()
      .trim()
      .refine((v) => v === '' || AGE_REGEX.test(v), 'Ingresa una edad válida'),
    sortOrder: z
      .string()
      .trim()
      .refine((v) => v === '' || AGE_REGEX.test(v), 'Ingresa un número válido'),
    imageUrl: z.string().trim().max(500),
    isActive: z.boolean(),
  })
  .refine(
    (data) =>
      data.minAge === '' || data.maxAge === '' || Number(data.minAge) <= Number(data.maxAge),
    {
      message: 'La edad mínima no puede ser mayor que la máxima',
      path: ['minAge'],
    },
  )

export type ProgramFormValues = z.infer<typeof programSchema>
