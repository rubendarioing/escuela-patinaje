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
import { getVenueProgramLinksForAdmin, getVenues } from '@/services/venues.service'
import { getPrograms } from '@/services/programs.service'
import {
  getAllInstructorsForAdmin,
  getInstructorProgramLinksForAdmin,
  type AdminInstructor,
} from '@/services/instructors.service'
import type { InstructorProgramLink } from '@/types/instructor'
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
import type { Venue, VenueProgramLink } from '@/types/venue'
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
  const [venueProgramLinks, setVenueProgramLinks] = useState<VenueProgramLink[]>([])
  // Sede y programa guardados al abrir en modo edición: el programa se conserva en la lista
  // aunque ya no esté activo en esa sede
  const [savedLink, setSavedLink] = useState<{ venueId: string; programId: string } | null>(null)
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])
  const [instructorProgramLinks, setInstructorProgramLinks] = useState<InstructorProgramLink[]>([])
  const [assignments, setAssignments] = useState<InstructorAssignment[]>([])
  const [assistantIds, setAssistantIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
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
      getVenueProgramLinksForAdmin(),
      getInstructorProgramLinksForAdmin(),
      loadPromise,
    ])
      .then(
        ([
          venueResult,
          programResult,
          instructorResult,
          assignmentResult,
          linkResult,
          instructorLinkResult,
          detail,
        ]) => {
          if (cancelled) return
          setVenues(venueResult)
          setPrograms(programResult)
          setVenueProgramLinks(linkResult)
          setInstructorProgramLinks(instructorLinkResult)
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
            setSavedLink({ venueId: detail.venueId, programId: detail.programId })
          }
        },
      )
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

  const venueId = watch('venueId')
  const programId = watch('programId')

  // Solo los programas que ofrece la sede elegida
  const venuePrograms = useMemo(() => {
    if (!venueId) return []
    const offeredIds = venueProgramLinks
      .filter((link) => link.venueId === venueId && link.isActive)
      .map((link) => link.programId)
    if (savedLink?.venueId === venueId) offeredIds.push(savedLink.programId)
    return programs.filter((p) => offeredIds.includes(p.id))
  }, [venueId, venueProgramLinks, programs, savedLink])

  // Al cambiar de sede, limpiar el programa si la nueva sede no lo ofrece
  useEffect(() => {
    if (programId && !venuePrograms.some((p) => p.id === programId)) {
      setValue('programId', '')
    }
  }, [programId, venuePrograms, setValue])

  const leadInstructorId = watch('leadInstructorId')

  // Solo los instructores que pertenecen al programa elegido
  const programInstructors = useMemo(() => {
    if (!programId) return []
    const memberIds = instructorProgramLinks
      .filter((link) => link.programId === programId)
      .map((link) => link.instructorId)
    return instructors.filter((i) => memberIds.includes(i.id))
  }, [programId, instructorProgramLinks, instructors])

  // Al cambiar de programa, quitar los instructores que no pertenecen al nuevo
  useEffect(() => {
    const memberIds = programInstructors.map((i) => i.id)
    if (leadInstructorId && !memberIds.includes(leadInstructorId)) {
      setValue('leadInstructorId', '')
    }
    setAssistantIds((prev) => {
      const next = prev.filter((x) => memberIds.includes(x))
      return next.length === prev.length ? prev : next
    })
  }, [programInstructors, leadInstructorId, setValue])

  const dayOfWeek = watch('dayOfWeek')
  const startTime = watch('startTime')
  const endTime = watch('endTime')

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
    } catch (error) {
      // 23503: la sede no ofrece ese programa (llave foránea hacia venue_programs)
      const { code, message } = (error as { code?: string; message?: string } | null) ?? {}
      setSubmitError(
        code === '23503'
          ? 'Esa sede no ofrece el programa elegido. Agrégalo primero desde Editar sede.'
          : message === 'instructor_not_in_program'
            ? 'Algún instructor elegido no pertenece al programa. Revisa los programas del instructor.'
            : 'No se pudo guardar el horario. Revisa los datos e inténtalo de nuevo.',
      )
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
            placeholder={venueId ? 'Elige un programa' : 'Primero elige una sede'}
            options={venuePrograms.map((p) => ({ value: p.id, label: p.name }))}
            error={errors.programId?.message}
            {...register('programId')}
          />
        </div>
        {venueId && venuePrograms.length === 0 && (
          <p className="text-xs text-amber-600">
            Esta sede no tiene programas.{' '}
            <Link to={`/admin/sedes/${venueId}/editar`} className="text-sky-700 hover:underline">
              Agrégalos en Editar sede
            </Link>{' '}
            antes de crear horarios.
          </p>
        )}

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
          placeholder={programId ? 'Sin instructor principal' : 'Primero elige un programa'}
          options={programInstructors.map((i) => ({
            value: i.id,
            label: `${i.firstName} ${i.lastName}${i.isActive ? '' : ' (inactivo)'}`,
          }))}
          {...register('leadInstructorId')}
        />

        <div>
          <p className="text-sm font-medium text-slate-700">Instructores auxiliares</p>
          <div className="mt-2 space-y-1">
            {programInstructors
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

        {programId && programInstructors.length === 0 && (
          <p className="text-xs text-amber-600">
            Ningún instructor pertenece a este programa.{' '}
            <Link to="/admin/instructores" className="text-sky-700 hover:underline">
              Asígnalo en Instructores
            </Link>
            .
          </p>
        )}
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
