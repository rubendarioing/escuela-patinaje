import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createVenue,
  getVenueById,
  getVenueProgramLinksForAdmin,
  setVenuePrograms,
  updateVenue,
} from '@/services/venues.service'
import { getAllProgramsForAdmin } from '@/services/programs.service'
import { getAllSchedulesForAdmin } from '@/services/schedules.service'
import type { Program } from '@/types/program'
import { venueSchema, type VenueFormValues } from '@/lib/validations/venue.schema'
import { slugify } from '@/lib/utils/slug'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { ImageUpload } from '@/components/forms/ImageUpload'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const emptyValues: VenueFormValues = {
  name: '',
  slug: '',
  address: '',
  city: '',
  description: '',
  phone: '',
  whatsapp: '',
  googleMapsUrl: '',
  imageUrl: '',
  isActive: true,
}

export function VenueFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [isLoadingVenue, setIsLoadingVenue] = useState(isEditMode)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [slugLocked, setSlugLocked] = useState(isEditMode)
  // Si al crear se guardó la sede pero fallaron sus programas, reintentar actualiza en vez de duplicar
  const [createdVenueId, setCreatedVenueId] = useState<string | null>(null)

  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [initialProgramIds, setInitialProgramIds] = useState<string[]>([])
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [activeSchedulesByProgram, setActiveSchedulesByProgram] = useState<Map<string, number>>(
    new Map(),
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(venueSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!isEditMode || !id) return
    let cancelled = false

    getVenueById(id)
      .then((venue) => {
        if (cancelled) return
        if (!venue) {
          setLoadError('Esa sede no existe.')
          return
        }
        reset({
          name: venue.name,
          slug: venue.slug,
          address: venue.address,
          city: venue.city ?? '',
          description: venue.description ?? '',
          phone: venue.phone ?? '',
          whatsapp: venue.whatsapp ?? '',
          googleMapsUrl: venue.googleMapsUrl ?? '',
          imageUrl: venue.imageUrl ?? '',
          isActive: venue.isActive,
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudo cargar la sede.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVenue(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id, reset])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getAllProgramsForAdmin(),
      isEditMode ? getVenueProgramLinksForAdmin() : Promise.resolve([]),
      isEditMode ? getAllSchedulesForAdmin() : Promise.resolve([]),
    ])
      .then(([programResult, linkResult, scheduleResult]) => {
        if (cancelled) return
        setPrograms(programResult)

        const linkedIds = linkResult
          .filter((link) => link.venueId === id && link.isActive)
          .map((link) => link.programId)
        setInitialProgramIds(linkedIds)
        setSelectedProgramIds(linkedIds)

        const counts = new Map<string, number>()
        scheduleResult
          .filter((s) => s.venueId === id && s.isActive)
          .forEach((s) => counts.set(s.programId, (counts.get(s.programId) ?? 0) + 1))
        setActiveSchedulesByProgram(counts)
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

  // Programas que se van a quitar de la sede y todavía tienen horarios activos
  const removedWithSchedules = useMemo(
    () =>
      programs.filter(
        (p) =>
          initialProgramIds.includes(p.id) &&
          !selectedProgramIds.includes(p.id) &&
          (activeSchedulesByProgram.get(p.id) ?? 0) > 0,
      ),
    [programs, initialProgramIds, selectedProgramIds, activeSchedulesByProgram],
  )

  const name = watch('name')

  useEffect(() => {
    if (isEditMode) return
    if (dirtyFields.slug) return
    setValue('slug', slugify(name))
  }, [name, isEditMode, dirtyFields.slug, setValue])

  const imageUrl = watch('imageUrl')

  const onSubmit = async (values: VenueFormValues) => {
    setSubmitError(null)

    const existingId = id ?? createdVenueId
    let venueId: string
    try {
      if (existingId) {
        await updateVenue(existingId, values)
        venueId = existingId
      } else {
        venueId = (await createVenue(values)).id
        setCreatedVenueId(venueId)
      }
    } catch {
      setSubmitError('No se pudo guardar la sede. Revisa los datos e inténtalo de nuevo.')
      return
    }

    try {
      await setVenuePrograms(venueId, selectedProgramIds)
      navigate('/admin/sedes')
    } catch {
      setSubmitError(
        'La sede se guardó, pero no se pudieron guardar sus programas. Inténtalo de nuevo.',
      )
    }
  }

  if (isLoadingVenue || isLoadingPrograms) return <LoadingState label="Cargando sede…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="space-y-6">
      <PageHeader title={isEditMode ? 'Editar sede' : 'Nueva sede'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-4">
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input
            id="name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('name')}
          />
        </FormField>

        <FormField label="Slug (para la URL)" htmlFor="slug" required error={errors.slug?.message}>
          <div className="flex items-center gap-2">
            <input
              id="slug"
              disabled={slugLocked}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              {...register('slug')}
            />
            {slugLocked && (
              <button
                type="button"
                onClick={() => setSlugLocked(false)}
                className="whitespace-nowrap text-sm text-sky-700 hover:underline"
              >
                Editar
              </button>
            )}
          </div>
          {!slugLocked && isEditMode && (
            <p className="mt-1 text-xs text-amber-600">
              Cambiar el slug rompe los enlaces que ya se hayan compartido con la URL anterior.
            </p>
          )}
        </FormField>

        <FormField label="Dirección" htmlFor="address" required error={errors.address?.message}>
          <input
            id="address"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('address')}
          />
        </FormField>

        <FormField label="Ciudad" htmlFor="city" error={errors.city?.message}>
          <input
            id="city"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('city')}
          />
        </FormField>

        <FormField label="Descripción" htmlFor="description" error={errors.description?.message}>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('description')}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <FormField
          label="URL de Google Maps"
          htmlFor="googleMapsUrl"
          error={errors.googleMapsUrl?.message}
        >
          <input
            id="googleMapsUrl"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('googleMapsUrl')}
          />
        </FormField>

        <ImageUpload
          label="Imagen"
          bucket="venues"
          folder={id ?? 'nueva'}
          value={imageUrl || null}
          onChange={(url) => setValue('imageUrl', url ?? '')}
        />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Programas que ofrece</legend>
          <p className="text-xs text-slate-500">
            Puedes dejar la sede sin programas y agregarlos después.
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
                const scheduleCount = activeSchedulesByProgram.get(program.id) ?? 0
                return (
                  <label
                    key={program.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProgramIds.includes(program.id)}
                      onChange={() => toggleProgram(program.id)}
                    />
                    {program.name}
                    {!program.isActive && ' (inactivo)'}
                    {scheduleCount > 0 && (
                      <span className="text-xs text-slate-500">
                        · {scheduleCount}{' '}
                        {scheduleCount === 1 ? 'horario activo' : 'horarios activos'}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          {removedWithSchedules.length > 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Aviso: {removedWithSchedules.map((p) => p.name).join(', ')}{' '}
              {removedWithSchedules.length === 1 ? 'tiene' : 'tienen'} horarios activos en esta
              sede. Al quitarlo{removedWithSchedules.length === 1 ? '' : 's'}, esos horarios dejarán
              de mostrarse en el sitio público.
            </p>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Sede activa (visible en el sitio público)
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
          <Link to="/admin/sedes" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
