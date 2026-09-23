import { z } from 'zod'

const TIME_REGEX = /^\d{2}:\d{2}$/

export const scheduleSchema = z
  .object({
    venueId: z.string().min(1, 'Elige una sede'),
    programId: z.string().min(1, 'Elige un programa'),
    dayOfWeek: z.string().min(1, 'Elige un día'),
    startTime: z.string().refine((v) => TIME_REGEX.test(v), 'Ingresa una hora válida'),
    endTime: z.string().refine((v) => TIME_REGEX.test(v), 'Ingresa una hora válida'),
    maxCapacity: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'El cupo debe ser mayor a 0'),
    leadInstructorId: z.string(),
    isActive: z.boolean(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'La hora de inicio debe ser anterior a la hora de fin',
    path: ['endTime'],
  })

export type ScheduleFormValues = z.infer<typeof scheduleSchema>
