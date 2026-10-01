import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getSchedules, getScheduleAvailability } from '@/services/schedules.service'
import { getVenues } from '@/services/venues.service'
import { submitPreregistration } from '@/services/preregistration.service'
import type { Schedule } from '@/types/schedule'
import type { Venue } from '@/types/venue'
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

const overlaps = (a: Schedule, b: Schedule) =>
  a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime

const scheduleLabel = (s: Schedule) =>
  `${s.program?.name ?? ''} · ${DAY_LABELS[s.dayOfWeek]} ${formatScheduleRange(s.startTime, s.endTime)}`

const ageOn = (birthDate: string): number | null => {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

export function InscriptionPage() {
  const [searchParams] = useSearchParams()
  const preselectedScheduleId = searchParams.get('horario')
  const preselectedProgramSlug = searchParams.get('programa')

  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [allVenues, setAllVenues] = useState<Venue[]>([])
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, number>>(new Map())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [venueId, setVenueId] = useState('')
  const [programId, setProgramId] = useState(ALL)
  // Programa sugerido por la URL (?programa=slug): se aplica al elegir una sede que lo ofrezca
  const [preferredProgramId, setPreferredProgramId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
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
      notes: '',
      consentAccepted: false,
      website: '',
    },
  })

  useEffect(() => {
    let cancelled = false

    // getSchedules ya trae solo horarios de programas publicables en su sede
    Promise.all([getSchedules(), getVenues(), getScheduleAvailability()])
      .then(([scheduleResult, venueResult, availabilityResult]) => {
        if (cancelled) return
        setSchedules(scheduleResult)
        setAllVenues(venueResult)
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
        if (availabilityMap.get(match.id) !== 0) setSelectedIds([match.id])
        return
      }
    }

    if (preselectedProgramSlug) {
      const match = schedules.find((s) => s.program?.slug === preselectedProgramSlug)
      if (match) setPreferredProgramId(match.programId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules])

  // Solo sedes con al menos un programa publicable (es decir, con horarios visibles)
  const venues = useMemo(() => {
    if (!schedules) return []
    const withSchedules = new Set(schedules.map((s) => s.venueId))
    return allVenues.filter((v) => withSchedules.has(v.id))
  }, [schedules, allVenues])

  const selectedVenue = venues.find((v) => v.id === venueId) ?? null
  const requiredCount = selectedVenue?.schedulesPerAthlete ?? 0

  const venueSchedules = useMemo(
    () => (schedules ?? []).filter((s) => s.venueId === venueId),
    [schedules, venueId],
  )

  const venuePrograms = useMemo(() => {
    const map = new Map<string, string>()
    venueSchedules.forEach((s) => s.program && map.set(s.program.id, s.program.name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [venueSchedules])

  const visibleSchedules =
    programId === ALL ? venueSchedules : venueSchedules.filter((s) => s.programId === programId)

  const selectedSchedules = useMemo(
    () =>
      selectedIds
        .map((id) => venueSchedules.find((s) => s.id === id))
        .filter((s): s is Schedule => s !== undefined),
    [selectedIds, venueSchedules],
  )

  // Por qué no se puede marcar un horario (null si se puede)
  const disabledReason = (schedule: Schedule): string | null => {
    if (selectedIds.includes(schedule.id)) return null
    if (availabilityMap.get(schedule.id) === 0) return 'sin cupo'
    if (selectedIds.length >= requiredCount) return null // se deshabilita sin texto: ya completó
    const clash = selectedSchedules.find((sel) => overlaps(sel, schedule))
    if (clash) return `se cruza con ${clash.program?.name ?? 'otro horario'}`
    return null
  }

  const handleVenueChange = (nextVenueId: string) => {
    setVenueId(nextVenueId)
    setSelectedIds([])
    setSelectionError(null)
    const offersPreferred = (schedules ?? []).some(
      (s) => s.venueId === nextVenueId && s.programId === preferredProgramId,
    )
    setProgramId(offersPreferred && preferredProgramId ? preferredProgramId : ALL)
  }

  const toggleSchedule = (scheduleId: string) => {
    setSelectionError(null)
    setSelectedIds((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : prev.length < requiredCount
          ? [...prev, scheduleId]
          : prev,
    )
  }

  const athleteBirthDate = watch('athleteBirthDate')

  const ageWarning = useMemo(() => {
    if (selectedSchedules.length === 0 || !athleteBirthDate) return null
    const age = ageOn(athleteBirthDate)
    if (age === null) return null

    const outOfRange = [
      ...new Set(
        selectedSchedules
          .filter((s) => {
            const { minAge, maxAge } = s.program ?? {}
            return (minAge != null && age < minAge) || (maxAge != null && age > maxAge)
          })
          .map((s) => s.program?.name ?? ''),
      ),
    ]
    if (outOfRange.length === 0) return null
    return `La edad del deportista (${age} años) está fuera del rango recomendado de: ${outOfRange.join(', ')}. Puedes continuar; lo revisaremos contigo.`
  }, [selectedSchedules, athleteBirthDate])

  const handleRetryLoad = () => {
    setLoadError(null)
    setSchedules(null)
    setRetryKey((key) => key + 1)
  }

  const onSubmit = async (values: PreregistrationFormValues) => {
    setSubmitError(null)

    if (!selectedVenue || selectedIds.length !== requiredCount) {
      setSelectionError(
        selectedVenue
          ? `Elige exactamente ${requiredCount} ${requiredCount === 1 ? 'horario' : 'horarios'}.`
          : 'Elige una sede y tus horarios.',
      )
      return
    }

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
        schedule_ids: selectedIds,
        notes: values.notes,
        consent_accepted: values.consentAccepted,
        consent_version: POLICY_VERSION,
        website: values.website ?? '',
      })

      if (result.ok) {
        setSubmitStatus('success')
        reset()
        setSelectedIds([])
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
        description="Inscribe a tu hijo o hija en la escuela de patinaje. Elige sede, programa y horarios."
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
          <legend className="text-lg font-semibold text-slate-900">Horarios</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="venueSelect" className="text-sm font-medium text-slate-700">
                Sede
              </label>
              <select
                id="venueSelect"
                value={venueId}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Elige una sede</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedVenue && (
              <div>
                <label htmlFor="programSelect" className="text-sm font-medium text-slate-700">
                  Programa
                </label>
                <select
                  id="programSelect"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value={ALL}>Todos los programas</option>
                  {venuePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {venues.length === 0 && (
            <p className="text-sm text-slate-600">
              Por ahora no hay horarios abiertos para inscripción. Escríbenos por WhatsApp y te
              avisamos.
            </p>
          )}

          {selectedVenue && (
            <>
              <p className="text-sm text-slate-600">
                En esta sede debes elegir exactamente{' '}
                <strong>
                  {requiredCount} {requiredCount === 1 ? 'horario' : 'horarios'}
                </strong>
                . Pueden ser de distintos programas, pero no pueden cruzarse entre sí.
              </p>

              <ul className="space-y-1">
                {visibleSchedules.map((schedule) => {
                  const isSelected = selectedIds.includes(schedule.id)
                  const reason = disabledReason(schedule)
                  const isDisabled =
                    !isSelected && (reason !== null || selectedIds.length >= requiredCount)
                  return (
                    <li key={schedule.id}>
                      <label
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
                          isSelected
                            ? 'border-sky-600 bg-sky-50 text-slate-900'
                            : 'border-slate-200 text-slate-700',
                          isDisabled && 'opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleSchedule(schedule.id)}
                        />
                        <span>
                          {scheduleLabel(schedule)}
                          {reason && <span className="text-xs text-slate-500"> · {reason}</span>}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <div
                className={cn(
                  'rounded-md px-3 py-2 text-sm',
                  selectedIds.length === requiredCount
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-50 text-slate-700',
                )}
              >
                <p className="font-medium">
                  Elegidos: {selectedIds.length} de {requiredCount}
                </p>
                {selectedSchedules.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {selectedSchedules.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span>{scheduleLabel(s)}</span>
                        <button
                          type="button"
                          onClick={() => toggleSchedule(s.id)}
                          className="text-xs text-sky-700 hover:underline"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {selectionError && <p className="text-xs text-red-600">{selectionError}</p>}
          {ageWarning && <p className="text-xs text-amber-600">{ageWarning}</p>}
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
