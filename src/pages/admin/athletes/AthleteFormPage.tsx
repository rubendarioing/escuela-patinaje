import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createAthlete,
  getAthleteById,
  getDocumentTypes,
  updateAthlete,
  type DocumentType,
} from '@/services/athletes.service'
import {
  athleteSchema,
  ATHLETE_STATUS_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  type AthleteFormValues,
} from '@/lib/validations/athlete.schema'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { SelectField } from '@/components/forms/SelectField'
import { DateField } from '@/components/forms/DateField'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const emptyValues: AthleteFormValues = {
  firstName: '',
  lastName: '',
  documentType: '',
  documentNumber: '',
  birthDate: '',
  gender: '',
  bloodType: '',
  notes: '',
  status: 'prospect',
}

export function AthleteFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AthleteFormValues>({
    resolver: zodResolver(athleteSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    let cancelled = false

    const athletePromise = isEditMode && id ? getAthleteById(id) : Promise.resolve(null)

    Promise.all([getDocumentTypes(), athletePromise])
      .then(([types, athlete]) => {
        if (cancelled) return
        setDocumentTypes(types)

        if (isEditMode) {
          if (!athlete) {
            setLoadError('Ese deportista no existe.')
            return
          }
          reset({
            firstName: athlete.firstName,
            lastName: athlete.lastName,
            documentType: athlete.documentType ?? '',
            documentNumber: athlete.documentNumber ?? '',
            birthDate: athlete.birthDate,
            gender: athlete.gender ?? '',
            bloodType: athlete.bloodType ?? '',
            notes: athlete.notes ?? '',
            status: athlete.status,
          })
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

  const onSubmit = async (values: AthleteFormValues) => {
    setSubmitError(null)
    try {
      if (isEditMode && id) {
        await updateAthlete(id, values)
        navigate(`/admin/deportistas/${id}`)
      } else {
        const created = await createAthlete(values)
        navigate(`/admin/deportistas/${created.id}`)
      }
    } catch {
      setSubmitError('No se pudo guardar el deportista. Revisa los datos e inténtalo de nuevo.')
    }
  }

  if (isLoadingData) return <LoadingState label="Cargando…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="space-y-6">
      <PageHeader title={isEditMode ? 'Editar deportista' : 'Nuevo deportista'} />

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
          <SelectField
            label="Tipo de documento"
            id="documentType"
            placeholder="(Sin documento)"
            options={documentTypes.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` }))}
            error={errors.documentType?.message}
            {...register('documentType')}
          />
          <FormField
            label="Número de documento"
            htmlFor="documentNumber"
            error={errors.documentNumber?.message}
          >
            <input
              id="documentNumber"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('documentNumber')}
            />
          </FormField>
        </div>

        <DateField
          label="Fecha de nacimiento"
          id="birthDate"
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Género" htmlFor="gender" error={errors.gender?.message}>
            <input
              id="gender"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('gender')}
            />
          </FormField>
          <SelectField
            label="Tipo de sangre"
            id="bloodType"
            placeholder="(Sin registrar)"
            options={BLOOD_TYPE_OPTIONS}
            error={errors.bloodType?.message}
            {...register('bloodType')}
          />
        </div>

        <SelectField
          label="Estado"
          id="status"
          options={ATHLETE_STATUS_OPTIONS}
          error={errors.status?.message}
          {...register('status')}
        />

        <FormField label="Notas" htmlFor="notes" error={errors.notes?.message}>
          <textarea
            id="notes"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('notes')}
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
          <Link to="/admin/deportistas" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
