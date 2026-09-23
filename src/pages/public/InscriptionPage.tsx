import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getSchedules, getScheduleAvailability } from '@/services/schedules.service'
import { submitPreregistration } from '@/services/preregistration.service'
import type { Schedule } from '@/types/schedule'
import {
  preregistrationSchema,
  type PreregistrationFormValues,
} from '@/lib/validations/preregistration.schema'
import { getPreregistrationErrorMessage } from '@/features/registrations/preregistrationMessages'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { Seo } from '@/components/common/Seo'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getWhatsAppUrl } from '@/lib/siteConfig'
import { POLICY_VERSION } from '@/lib/policyVersion'

const ALL = 'all'

export function InscriptionPage() {
  const [searchParams] = useSearchParams()
  const preselectedScheduleId = searchParams.get('horario')
  const preselectedProgramSlug = searchParams.get('programa')

  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, number>>(new Map())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [venueId, setVenueId] = useState(ALL)
  const [programId, setProgramId] = useState(ALL)

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PreregistrationFormValues>({
    resolver: zodResolver(preregistrationSchema),
    defaultValues: {
      athleteFirstName: '',
      athleteLastName: '',
      athleteBirthDate: '',
      guardianFirstName: '',
      guardianLastName: '',
      guardianPhone: '',
      guardianWhatsapp: '',
      guardianEmail: '',
      scheduleId: '',
      notes: '',
      consentAccepted: false,
      website: '',
    },
  })

  useEffect(() => {
    let cancelled = false

    Promise.all([getSchedules(), getScheduleAvailability()])
      .then(([scheduleResult, availabilityResult]) => {
        if (cancelled) return
        setSchedules(scheduleResult)
        setAvailabilityMap(new Map(availabilityResult.map((a) => [a.scheduleId, a.availableSpots])))
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('No se pudieron cargar los horarios disponibles.')
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  // Preseleccionar sede/programa/horario según la URL, una sola vez, cuando los horarios ya cargaron
  useEffect(() => {
    if (!schedules) return

    if (preselectedScheduleId) {
      const match = schedules.find((s) => s.id === preselectedScheduleId)
      if (match) {
        setVenueId(match.venueId)
        setProgramId(match.programId)
        setValue('scheduleId', match.id)
        return
      }
    }

    if (preselectedProgramSlug) {
      const match = schedules.find((s) => s.program?.slug === preselectedProgramSlug)
      if (match) setProgramId(match.programId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules])

  const venues = useMemo(() => {
    if (!schedules) return []
    const map = new Map<string, string>()
    schedules.forEach((s) => s.venue && map.set(s.venue.id, s.venue.name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [schedules])

  const programs = useMemo(() => {
    if (!schedules) return []
    const map = new Map<string, string>()
    schedules.forEach((s) => s.program && map.set(s.program.id, s.program.name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [schedules])

  const filteredSchedules = useMemo(() => {
    if (!schedules) return []
    return schedules.filter((s) => {
      if (venueId !== ALL && s.venueId !== venueId) return false
      if (programId !== ALL && s.programId !== programId) return false
      return true
    })
  }, [schedules, venueId, programId])

  const scheduleId = watch('scheduleId')
  const athleteBirthDate = watch('athleteBirthDate')
  const selectedSchedule = schedules?.find((s) => s.id === scheduleId) ?? null

  const ageWarning = useMemo(() => {
    if (!selectedSchedule || !athleteBirthDate) return null
    const birth = new Date(athleteBirthDate)
    if (Number.isNaN(birth.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const hasHadBirthdayThisYear =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
    if (!hasHadBirthdayThisYear) age -= 1

    const { minAge, maxAge } = selectedSchedule.program ?? {}
    if (minAge != null && age < minAge) {
      return `La edad del deportista (${age} años) está por debajo del rango recomendado de este programa (desde ${minAge} años). Puedes continuar; lo revisaremos contigo.`
    }
    if (maxAge != null && age > maxAge) {
      return `La edad del deportista (${age} años) está por encima del rango recomendado de este programa (hasta ${maxAge} años). Puedes continuar; lo revisaremos contigo.`
    }
    return null
  }, [selectedSchedule, athleteBirthDate])

  const handleRetryLoad = () => {
    setLoadError(null)
    setSchedules(null)
    setRetryKey((key) => key + 1)
  }

  const onSubmit = async (values: PreregistrationFormValues) => {
    setSubmitError(null)
    setSubmitStatus('submitting')

    try {
      const result = await submitPreregistration({
        athlete_first_name: values.athleteFirstName,
        athlete_last_name: values.athleteLastName,
        athlete_birth_date: values.athleteBirthDate,
        guardian_first_name: values.guardianFirstName,
        guardian_last_name: values.guardianLastName,
        guardian_phone: values.guardianPhone,
        guardian_whatsapp: values.guardianWhatsapp,
        guardian_email: values.guardianEmail,
        schedule_id: values.scheduleId,
        notes: values.notes,
        consent_accepted: values.consentAccepted,
        consent_version: POLICY_VERSION,
        website: values.website ?? '',
      })

      if (result.ok) {
        setSubmitStatus('success')
        reset()
      } else {
        setSubmitStatus('idle')
        setSubmitError(getPreregistrationErrorMessage(result.code))
      }
    } catch {
      setSubmitStatus('idle')
      setSubmitError(getPreregistrationErrorMessage())
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={handleRetryLoad} />
  if (!schedules) return <LoadingState label="Cargando horarios…" />

  if (submitStatus === 'success') {
    return (
      <PageContainer>
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Inscripción recibida</h1>
          <p className="mt-2 text-slate-600">Nos pondremos en contacto contigo.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href={getWhatsAppUrl('Hola, acabo de enviar una preinscripción.')}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              Hablar por WhatsApp
            </a>
            <Link to="/" className={cn(buttonVariants({ variant: 'outline' }))}>
              Volver al inicio
            </Link>
          </div>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Seo
        title="Inscripción"
        description="Inscribe a tu hijo o hija en la escuela de patinaje. Elige sede, programa y horario."
      />
      <SectionTitle
        title="Inscripción"
        subtitle="Completa el formulario y nos pondremos en contacto."
        level="h1"
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Honeypot: campo oculto, los bots suelen completarlo */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
          {...register('website')}
        />

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-slate-900">Deportista</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="athleteFirstName" className="text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="athleteFirstName"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('athleteFirstName')}
              />
              {errors.athleteFirstName && (
                <p className="mt-1 text-xs text-red-600">{errors.athleteFirstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="athleteLastName" className="text-sm font-medium text-slate-700">
                Apellido
              </label>
              <input
                id="athleteLastName"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('athleteLastName')}
              />
              {errors.athleteLastName && (
                <p className="mt-1 text-xs text-red-600">{errors.athleteLastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="athleteBirthDate" className="text-sm font-medium text-slate-700">
              Fecha de nacimiento
            </label>
            <input
              id="athleteBirthDate"
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-auto"
              {...register('athleteBirthDate')}
            />
            {errors.athleteBirthDate && (
              <p className="mt-1 text-xs text-red-600">{errors.athleteBirthDate.message}</p>
            )}
            {ageWarning && <p className="mt-1 text-xs text-amber-600">{ageWarning}</p>}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-slate-900">Acudiente</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="guardianFirstName" className="text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="guardianFirstName"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('guardianFirstName')}
              />
              {errors.guardianFirstName && (
                <p className="mt-1 text-xs text-red-600">{errors.guardianFirstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="guardianLastName" className="text-sm font-medium text-slate-700">
                Apellido
              </label>
              <input
                id="guardianLastName"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('guardianLastName')}
              />
              {errors.guardianLastName && (
                <p className="mt-1 text-xs text-red-600">{errors.guardianLastName.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="guardianPhone" className="text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <input
                id="guardianPhone"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('guardianPhone')}
              />
            </div>
            <div>
              <label htmlFor="guardianWhatsapp" className="text-sm font-medium text-slate-700">
                WhatsApp
              </label>
              <input
                id="guardianWhatsapp"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('guardianWhatsapp')}
              />
            </div>
            <div>
              <label htmlFor="guardianEmail" className="text-sm font-medium text-slate-700">
                Correo
              </label>
              <input
                id="guardianEmail"
                type="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('guardianEmail')}
              />
              {errors.guardianEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.guardianEmail.message}</p>
              )}
            </div>
          </div>
          {errors.guardianPhone && (
            <p className="text-xs text-red-600">{errors.guardianPhone.message}</p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-slate-900">Horario</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="venueFilter" className="text-sm font-medium text-slate-700">
                Sede
              </label>
              <select
                id="venueFilter"
                value={venueId}
                onChange={(e) => {
                  setVenueId(e.target.value)
                  setValue('scheduleId', '')
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={ALL}>Todas las sedes</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="programFilter" className="text-sm font-medium text-slate-700">
                Programa
              </label>
              <select
                id="programFilter"
                value={programId}
                onChange={(e) => {
                  setProgramId(e.target.value)
                  setValue('scheduleId', '')
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={ALL}>Todos los programas</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="scheduleId" className="text-sm font-medium text-slate-700">
              Horario
            </label>
            <select
              id="scheduleId"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('scheduleId')}
            >
              <option value="">Elige un horario</option>
              {filteredSchedules.map((s) => {
                const spots = availabilityMap.get(s.id)
                const isFull = spots === 0
                return (
                  <option key={s.id} value={s.id} disabled={isFull}>
                    {s.venue?.name} · {s.program?.name} · {DAY_LABELS[s.dayOfWeek]}{' '}
                    {formatScheduleRange(s.startTime, s.endTime)}
                    {isFull ? ' (sin cupo)' : ''}
                  </option>
                )
              })}
            </select>
            {errors.scheduleId && (
              <p className="mt-1 text-xs text-red-600">{errors.scheduleId.message}</p>
            )}
          </div>
        </fieldset>

        <div>
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Observaciones
          </label>
          <textarea
            id="notes"
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('notes')}
          />
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" {...register('consentAccepted')} />
            <span>
              Declaro que soy el acudiente o representante legal del deportista y autorizo el
              tratamiento de sus datos según la{' '}
              <Link to="/privacidad" className="text-sky-700 underline" target="_blank">
                Política de privacidad
              </Link>
              .
            </span>
          </label>
          {errors.consentAccepted && (
            <p className="mt-1 text-xs text-red-600">{errors.consentAccepted.message}</p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || submitStatus === 'submitting'}
          className={cn(buttonVariants({ variant: 'default' }), 'w-full disabled:opacity-50')}
        >
          {isSubmitting || submitStatus === 'submitting' ? 'Enviando…' : 'Enviar inscripción'}
        </button>
      </form>
    </PageContainer>
  )
}
