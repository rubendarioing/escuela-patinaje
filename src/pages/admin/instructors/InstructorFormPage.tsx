import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createInstructor,
  getInstructorById,
  updateInstructor,
} from '@/services/instructors.service'
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

  const photoUrl = watch('photoUrl')

  const onSubmit = async (values: InstructorFormValues) => {
    setSubmitError(null)
    try {
      if (isEditMode && id) {
        await updateInstructor(id, values)
      } else {
        await createInstructor(values)
      }
      navigate('/admin/instructores')
    } catch {
      setSubmitError('No se pudo guardar el instructor. Revisa los datos e inténtalo de nuevo.')
    }
  }

  if (isLoadingInstructor) return <LoadingState label="Cargando instructor…" />
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
