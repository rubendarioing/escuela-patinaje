import { useEffect, useMemo, useState } from 'react'
import type { Schedule } from '@/types/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { ScheduleCard } from '@/features/schedules/ScheduleCard'
import { DAY_LABELS } from '@/lib/utils/schedule'
import { getSchedules, getScheduleAvailability } from '@/services/schedules.service'

const ALL = 'all'

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [venueId, setVenueId] = useState(ALL)
  const [programId, setProgramId] = useState(ALL)
  const [dayOfWeek, setDayOfWeek] = useState(ALL)
  const [age, setAge] = useState('')

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
        setError('No se pudieron cargar los horarios.')
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setSchedules(null)
    setRetryKey((key) => key + 1)
  }

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
    const ageNumber = age.trim() === '' ? null : Number(age)

    return schedules.filter((s) => {
      if (venueId !== ALL && s.venueId !== venueId) return false
      if (programId !== ALL && s.programId !== programId) return false
      if (dayOfWeek !== ALL && s.dayOfWeek !== Number(dayOfWeek)) return false
      if (ageNumber != null && !Number.isNaN(ageNumber)) {
        const min = s.program?.minAge ?? null
        const max = s.program?.maxAge ?? null
        if (min != null && ageNumber < min) return false
        if (max != null && ageNumber > max) return false
      }
      return true
    })
  }, [schedules, venueId, programId, dayOfWeek, age])

  const hasActiveFilters = venueId !== ALL || programId !== ALL || dayOfWeek !== ALL || age !== ''

  const clearFilters = () => {
    setVenueId(ALL)
    setProgramId(ALL)
    setDayOfWeek(ALL)
    setAge('')
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!schedules) return <LoadingState label="Cargando horarios…" />

  return (
    <PageContainer>
      <SectionTitle title="Horarios" subtitle="Filtra por sede, programa, día o edad." />

      <div className="grid gap-3 sm:grid-cols-4">
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={ALL}>Todas las sedes</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={ALL}>Todos los programas</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={ALL}>Todos los días</option>
          {Object.entries(DAY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          placeholder="Edad del deportista"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="text-sm text-sky-700 underline">
          Limpiar filtros
        </button>
      )}

      {filteredSchedules.length === 0 ? (
        <EmptyState
          title="No hay horarios con estos filtros"
          description="Prueba con otra combinación, o escríbenos por WhatsApp."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-sky-700 underline"
              >
                Limpiar filtros
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              enrollHref={`/inscripcion?horario=${schedule.id}`}
              availableSpots={availabilityMap.get(schedule.id)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
