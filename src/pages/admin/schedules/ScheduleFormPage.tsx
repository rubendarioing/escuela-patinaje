import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  getScheduleDetailById,
  getInstructorAssignments,
  saveTrainingSchedule,
  type InstructorAssignment,
} from '@/services/schedules.service'
import { getVenues } from '@/services/venues.service'
import { getPrograms } from '@/services/programs.service'
import { getAllInstructorsForAdmin, type AdminInstructor } from '@/services/instructors.service'
import { scheduleSchema, type ScheduleFormValues } from '@/lib/validations/schedule.schema'
import { DAY_LABELS } from '@/lib/utils/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { SelectField } from '@/components/forms/SelectField'
import { TimeField } from '@/components/forms/TimeField'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Venue } from '@/types/venue'
import type { Program } from '@/types/program'

const emptyValues: ScheduleFormValues = {
  venueId: '',
  programId: '',
  dayOfWeek: '',
  startTime: '',
  endTime: '',
  maxCapacity: '',
  leadInstructorId: '',
  isActive: true,
}

export function ScheduleFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [venues, setVenues] = useState<Venue[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])
  const [assignments, setAssignments] = useState<InstructorAssignment[]>([])
  const [assistantIds, setAssistantIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    let cancelled = false

    const loadPromise = isEditMode && id ? getScheduleDetailById(id) : Promise.resolve(null)

    Promise.all([
      getVenues(),
      getPrograms(),
      getAllInstructorsForAdmin(),
      getInstructorAssignments(),
      loadPromise,
    ])
      .then(([venueResult, programResult, instructorResult, assignmentResult, detail]) => {
        if (cancelled) return
        setVenues(venueResult)
        setPrograms(programResult)
        setInstructors(instructorResult)
        setAssignments(assignmentResult)

        if (isEditMode) {
          if (!detail) {
            setLoadError('Ese horario no existe.')
            return
          }
          reset({
            venueId: detail.venueId,
            programId: detail.programId,
            dayOfWeek: String(detail.dayOfWeek),
            startTime: detail.startTime.slice(0, 5),
            endTime: detail.endTime.slice(0, 5),
            maxCapacity: String(detail.maxCapacity),
            leadInstructorId: detail.leadInstructorId ?? '',
            isActive: detail.isActive,
          })
          setAssistantIds(detail.assistantInstructorIds)
        }
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudo cargar la información necesaria.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id, reset])

  const dayOfWeek = watch('dayOfWeek')
  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const leadInstructorId = watch('leadInstructorId')

  const selectedInstructorIds = useMemo(
    () => [leadInstructorId, ...assistantIds].filter(Boolean),
    [leadInstructorId, assistantIds],
  )

  // Aviso opcional: el mismo instructor ya tiene otro horario que se cruza ese día
  const conflictWarning = useMemo(() => {
    if (!dayOfWeek || !startTime || !endTime || selectedInstructorIds.length === 0) return null

    const day = Number(dayOfWeek)
    const conflicts = assignments.filter(
      (a) =>
        a.scheduleId !== id &&
        a.dayOfWeek === day &&
        selectedInstructorIds.includes(a.instructorId) &&
        startTime < a.endTime.slice(0, 5) &&
        a.startTime.slice(0, 5) < endTime,
    )

    if (conflicts.length === 0) return null

    const names = conflicts
      .map((c) => instructors.find((i) => i.id === c.instructorId))
      .filter(Boolean)
      .map((i) => `${i!.firstName} ${i!.lastName}`)

    return `Aviso: ${[...new Set(names)].join(', ')} ya tiene otro horario que se cruza ese día. Puedes guardar de todas formas.`
  }, [dayOfWeek, startTime, endTime, selectedInstructorIds, assignments, instructors, id])

  const noInstructorWarning = selectedInstructorIds.length === 0

  const toggleAssistant = (instructorId: string) => {
    setAssistantIds((prev) =>
      prev.includes(instructorId)
        ? prev.filter((x) => x !== instructorId)
        : [...prev, instructorId],
    )
  }

  const onSubmit = async (values: ScheduleFormValues) => {
    setSubmitError(null)
    try {
      await saveTrainingSchedule({
        id,
        venueId: values.venueId,
        programId: values.programId,
        dayOfWeek: Number(values.dayOfWeek),
        startTime: values.startTime,
        endTime: values.endTime,
        maxCapacity: Number(values.maxCapacity),
        isActive: values.isActive,
        leadInstructorId: values.leadInstructorId || null,
        assistantInstructorIds: assistantIds,
      })
      navigate('/admin/horarios')
    } catch {
      setSubmitError('No se pudo guardar el horario. Revisa los datos e inténtalo de nuevo.')
    }
  }

  if (isLoadingData) return <LoadingState label="Cargando…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="space-y-6">
      <PageHeader title={isEditMode ? 'Editar horario' : 'Nuevo horario'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Sede"
            id="venueId"
            placeholder="Elige una sede"
            options={venues.map((v) => ({ value: v.id, label: v.name }))}
            error={errors.venueId?.message}
            {...register('venueId')}
          />
          <SelectField
            label="Programa"
            id="programId"
            placeholder="Elige un programa"
            options={programs.map((p) => ({ value: p.id, label: p.name }))}
            error={errors.programId?.message}
            {...register('programId')}
          />
        </div>

        <SelectField
          label="Día"
          id="dayOfWeek"
          placeholder="Elige un día"
          options={Object.entries(DAY_LABELS).map(([value, label]) => ({ value, label }))}
          error={errors.dayOfWeek?.message}
          {...register('dayOfWeek')}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <TimeField
            label="Hora inicio"
            id="startTime"
            error={errors.startTime?.message}
            {...register('startTime')}
          />
          <TimeField
            label="Hora fin"
            id="endTime"
            error={errors.endTime?.message}
            {...register('endTime')}
          />
          <FormField
            label="Cupo máximo"
            htmlFor="maxCapacity"
            required
            error={errors.maxCapacity?.message}
          >
            <input
              id="maxCapacity"
              type="number"
              min={1}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('maxCapacity')}
            />
          </FormField>
        </div>

        <SelectField
          label="Instructor principal"
          id="leadInstructorId"
          placeholder="Sin instructor principal"
          options={instructors.map((i) => ({
            value: i.id,
            label: `${i.firstName} ${i.lastName}${i.isActive ? '' : ' (inactivo)'}`,
          }))}
          {...register('leadInstructorId')}
        />

        <div>
          <p className="text-sm font-medium text-slate-700">Instructores auxiliares</p>
          <div className="mt-2 space-y-1">
            {instructors
              .filter((i) => i.id !== leadInstructorId)
              .map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={assistantIds.includes(i.id)}
                    onChange={() => toggleAssistant(i.id)}
                  />
                  {i.firstName} {i.lastName}
                  {!i.isActive && ' (inactivo)'}
                </label>
              ))}
          </div>
        </div>

        {noInstructorWarning && (
          <p className="text-xs text-amber-600">
            Recomendado: asigna al menos un instructor a este horario.
          </p>
        )}
        {conflictWarning && <p className="text-xs text-amber-600">{conflictWarning}</p>}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Horario activo (visible en el sitio público)
        </label>

        {submitError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(buttonVariants({ variant: 'default' }), 'disabled:opacity-50')}
          >
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
          <Link to="/admin/horarios" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
