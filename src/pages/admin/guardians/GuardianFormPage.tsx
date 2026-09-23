import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createGuardian, getGuardianById, updateGuardian } from '@/services/guardians.service'
import { guardianSchema, type GuardianFormValues } from '@/lib/validations/guardian.schema'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const emptyValues: GuardianFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  whatsapp: '',
  email: '',
}

export function GuardianFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [isLoadingGuardian, setIsLoadingGuardian] = useState(isEditMode)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!isEditMode || !id) return
    let cancelled = false

    getGuardianById(id)
      .then((guardian) => {
        if (cancelled) return
        if (!guardian) {
          setLoadError('Ese acudiente no existe.')
          return
        }
        reset({
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          phone: guardian.phone ?? '',
          whatsapp: guardian.whatsapp ?? '',
          email: guardian.email ?? '',
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudo cargar el acudiente.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGuardian(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id, reset])

  const onSubmit = async (values: GuardianFormValues) => {
    setSubmitError(null)
    try {
      if (isEditMode && id) {
        await updateGuardian(id, values)
      } else {
        await createGuardian(values)
      }
      navigate('/admin/acudientes')
    } catch {
      setSubmitError('No se pudo guardar el acudiente. Revisa los datos e inténtalo de nuevo.')
    }
  }

  if (isLoadingGuardian) return <LoadingState label="Cargando acudiente…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="space-y-6">
      <PageHeader title={isEditMode ? 'Editar acudiente' : 'Nuevo acudiente'} />

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

        <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
          <input
            id="phone"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('phone')}
          />
        </FormField>

        <FormField label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp?.message}>
          <input
            id="whatsapp"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('whatsapp')}
          />
        </FormField>

        <FormField label="Correo" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('email')}
          />
        </FormField>

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
          <Link to="/admin/acudientes" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
