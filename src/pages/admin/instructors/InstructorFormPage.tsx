import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createInstructor,
  getAssignedScheduleCountByProgram,
  getInstructorById,
  getInstructorProgramLinksForAdmin,
  setInstructorPrograms,
  updateInstructor,
} from '@/services/instructors.service'
import { getAllProgramsForAdmin } from '@/services/programs.service'
import type { Program } from '@/types/program'
import { instructorSchema, type InstructorFormValues } from '@/lib/validations/instructor.schema'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { ImageUpload } from '@/components/forms/ImageUpload'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const emptyValues: InstructorFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialty: '',
  bio: '',
  photoUrl: '',
  isActive: true,
}

export function InstructorFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [isLoadingInstructor, setIsLoadingInstructor] = useState(isEditMode)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Si al crear se guardó el instructor pero fallaron sus programas, reintentar actualiza en vez de duplicar
  const [createdInstructorId, setCreatedInstructorId] = useState<string | null>(null)

  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [scheduleCountByProgram, setScheduleCountByProgram] = useState<Map<string, number>>(
    new Map(),
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!isEditMode || !id) return
    let cancelled = false

    getInstructorById(id)
      .then((instructor) => {
        if (cancelled) return
        if (!instructor) {
          setLoadError('Ese instructor no existe.')
          return
        }
        reset({
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email ?? '',
          phone: instructor.phone ?? '',
          specialty: instructor.specialty ?? '',
          bio: instructor.bio ?? '',
          photoUrl: instructor.photoUrl ?? '',
          isActive: instructor.isActive,
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudo cargar el instructor.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInstructor(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id, reset])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getAllProgramsForAdmin(),
      isEditMode ? getInstructorProgramLinksForAdmin() : Promise.resolve([]),
      isEditMode && id
        ? getAssignedScheduleCountByProgram(id)
        : Promise.resolve(new Map<string, number>()),
    ])
      .then(([programResult, linkResult, countResult]) => {
        if (cancelled) return
        setPrograms(programResult)
        setSelectedProgramIds(
          linkResult.filter((link) => link.instructorId === id).map((link) => link.programId),
        )
        setScheduleCountByProgram(countResult)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudieron cargar los programas.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPrograms(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id])

  const toggleProgram = (programId: string) => {
    setSelectedProgramIds((prev) =>
      prev.includes(programId) ? prev.filter((x) => x !== programId) : [...prev, programId],
    )
  }

  const photoUrl = watch('photoUrl')

  const onSubmit = async (values: InstructorFormValues) => {
    setSubmitError(null)

    const existingId = id ?? createdInstructorId
    let instructorId: string
    try {
      if (existingId) {
        await updateInstructor(existingId, values)
        instructorId = existingId
      } else {
        instructorId = (await createInstructor(values)).id
        setCreatedInstructorId(instructorId)
      }
    } catch {
      setSubmitError('No se pudo guardar el instructor. Revisa los datos e inténtalo de nuevo.')
      return
    }

    try {
      await setInstructorPrograms(instructorId, selectedProgramIds)
      navigate('/admin/instructores')
    } catch (error) {
      const message = (error as { message?: string } | null)?.message
      setSubmitError(
        message === 'instructor_program_in_use'
          ? 'No se puede quitar un programa en el que el instructor tiene horarios asignados. Quítalo primero de esos horarios.'
          : 'El instructor se guardó, pero no se pudieron guardar sus programas. Inténtalo de nuevo.',
      )
    }
  }

  if (isLoadingInstructor || isLoadingPrograms) return <LoadingState label="Cargando instructor…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="space-y-6">
      <PageHeader title={isEditMode ? 'Editar instructor' : 'Nuevo instructor'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" htmlFor="firstName" required error={errors.firstName?.message}>
            <input
              id="firstName"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('firstName')}
            />
          </FormField>
          <FormField label="Apellido" htmlFor="lastName" required error={errors.lastName?.message}>
            <input
              id="lastName"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('lastName')}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Correo" htmlFor="email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('email')}
            />
          </FormField>
          <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
            <input
              id="phone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('phone')}
            />
          </FormField>
        </div>

        <FormField label="Especialidad" htmlFor="specialty" error={errors.specialty?.message}>
          <input
            id="specialty"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('specialty')}
          />
        </FormField>

        <FormField label="Biografía" htmlFor="bio" error={errors.bio?.message}>
          <textarea
            id="bio"
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('bio')}
          />
        </FormField>

        <ImageUpload
          label="Fotografía"
          bucket="instructors"
          folder={id ?? 'nuevo'}
          value={photoUrl || null}
          onChange={(url) => setValue('photoUrl', url ?? '')}
        />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Programas</legend>
          <p className="text-xs text-slate-500">
            Solo se le podrán asignar horarios de los programas que marques.
          </p>
          {programs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Todavía no hay programas.{' '}
              <Link to="/admin/programas/nuevo" className="text-sky-700 hover:underline">
                Crear un programa
              </Link>
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {programs.map((program) => {
                const scheduleCount = scheduleCountByProgram.get(program.id) ?? 0
                const isLocked = scheduleCount > 0 && selectedProgramIds.includes(program.id)
                return (
                  <label
                    key={program.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProgramIds.includes(program.id)}
                      disabled={isLocked}
                      onChange={() => toggleProgram(program.id)}
                    />
                    {program.name}
                    {!program.isActive && ' (inactivo)'}
                    {scheduleCount > 0 && (
                      <span className="text-xs text-slate-500">
                        · asignado en {scheduleCount} {scheduleCount === 1 ? 'horario' : 'horarios'}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          {programs.length > 0 && selectedProgramIds.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Sin programas, este instructor no se podrá asignar a ningún horario.
            </p>
          )}
          {[...scheduleCountByProgram.values()].some((n) => n > 0) && (
            <p className="mt-2 text-xs text-slate-500">
              Para quitar un programa bloqueado, primero quita al instructor de sus horarios.
            </p>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Instructor activo (visible en el sitio público)
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
          <Link to="/admin/instructores" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
