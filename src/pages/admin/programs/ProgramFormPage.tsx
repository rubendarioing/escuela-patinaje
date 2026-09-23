import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgram, getProgramById, updateProgram } from '@/services/programs.service'
import {
  programSchema,
  PROGRAM_LEVEL_OPTIONS,
  type ProgramFormValues,
} from '@/lib/validations/program.schema'
import { slugify } from '@/lib/utils/slug'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { SelectField } from '@/components/forms/SelectField'
import { ImageUpload } from '@/components/forms/ImageUpload'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const emptyValues: ProgramFormValues = {
  name: '',
  slug: '',
  description: '',
  level: '',
  minAge: '',
  maxAge: '',
  sortOrder: '',
  imageUrl: '',
  isActive: true,
}

export function ProgramFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [isLoadingProgram, setIsLoadingProgram] = useState(isEditMode)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [slugLocked, setSlugLocked] = useState(isEditMode)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!isEditMode || !id) return
    let cancelled = false

    getProgramById(id)
      .then((program) => {
        if (cancelled) return
        if (!program) {
          setLoadError('Ese programa no existe.')
          return
        }
        reset({
          name: program.name,
          slug: program.slug,
          description: program.description ?? '',
          level: program.level ?? '',
          minAge: program.minAge != null ? String(program.minAge) : '',
          maxAge: program.maxAge != null ? String(program.maxAge) : '',
          sortOrder: String(program.sortOrder),
          imageUrl: program.imageUrl ?? '',
          isActive: program.isActive,
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudo cargar el programa.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProgram(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id, reset])

  const name = watch('name')

  useEffect(() => {
    if (isEditMode) return
    if (dirtyFields.slug) return
    setValue('slug', slugify(name))
  }, [name, isEditMode, dirtyFields.slug, setValue])

  const imageUrl = watch('imageUrl')

  const onSubmit = async (values: ProgramFormValues) => {
    setSubmitError(null)
    try {
      if (isEditMode && id) {
        await updateProgram(id, values)
      } else {
        await createProgram(values)
      }
      navigate('/admin/programas')
    } catch {
      setSubmitError('No se pudo guardar el programa. Revisa los datos e inténtalo de nuevo.')
    }
  }

  if (isLoadingProgram) return <LoadingState label="Cargando programa…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="space-y-6">
      <PageHeader title={isEditMode ? 'Editar programa' : 'Nuevo programa'} />

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

        <FormField label="Descripción" htmlFor="description" error={errors.description?.message}>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('description')}
          />
        </FormField>

        <SelectField
          label="Nivel (opcional)"
          id="level"
          placeholder="(Sin nivel)"
          options={PROGRAM_LEVEL_OPTIONS}
          error={errors.level?.message}
          {...register('level')}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Edad mínima" htmlFor="minAge" error={errors.minAge?.message}>
            <input
              id="minAge"
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('minAge')}
            />
          </FormField>
          <FormField label="Edad máxima" htmlFor="maxAge" error={errors.maxAge?.message}>
            <input
              id="maxAge"
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('maxAge')}
            />
          </FormField>
          <FormField label="Orden" htmlFor="sortOrder" error={errors.sortOrder?.message}>
            <input
              id="sortOrder"
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('sortOrder')}
            />
          </FormField>
        </div>

        <ImageUpload
          label="Imagen"
          bucket="programs"
          folder={id ?? 'nuevo'}
          value={imageUrl || null}
          onChange={(url) => setValue('imageUrl', url ?? '')}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Programa activo (visible en el sitio público)
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
          <Link to="/admin/programas" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
