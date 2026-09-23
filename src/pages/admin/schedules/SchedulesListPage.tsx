import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAllSchedulesForAdmin,
  getScheduleAvailability,
  setScheduleActive,
} from '@/services/schedules.service'
import { getVenues } from '@/services/venues.service'
import { getPrograms } from '@/services/programs.service'
import { getAllInstructorsForAdmin } from '@/services/instructors.service'
import type { Schedule } from '@/types/schedule'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALL = 'all'

export function SchedulesListPage() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, number>>(new Map())
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([])
  const [instructors, setInstructors] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [venueId, setVenueId] = useState(ALL)
  const [programId, setProgramId] = useState(ALL)
  const [instructorId, setInstructorId] = useState(ALL)
  const [dayOfWeek, setDayOfWeek] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  const [pendingToggle, setPendingToggle] = useState<Schedule | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getAllSchedulesForAdmin(),
      getScheduleAvailability(),
      getVenues(),
      getPrograms(),
      getAllInstructorsForAdmin(),
    ])
      .then(
        ([scheduleResult, availabilityResult, venueResult, programResult, instructorResult]) => {
          if (cancelled) return
          setSchedules(scheduleResult)
          setAvailabilityMap(
            new Map(availabilityResult.map((a) => [a.scheduleId, a.enrolledCount])),
          )
          setVenues(venueResult)
          setPrograms(programResult)
          setInstructors(instructorResult)
        },
      )
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

  const filteredSchedules = useMemo(() => {
    if (!schedules) return []
    return schedules.filter((s) => {
      if (venueId !== ALL && s.venueId !== venueId) return false
      if (programId !== ALL && s.programId !== programId) return false
      if (instructorId !== ALL && s.leadInstructor?.id !== instructorId) return false
      if (dayOfWeek !== ALL && s.dayOfWeek !== Number(dayOfWeek)) return false
      if (status === 'active' && !s.isActive) return false
      if (status === 'inactive' && s.isActive) return false
      return true
    })
  }, [schedules, venueId, programId, instructorId, dayOfWeek, status])

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    setIsToggling(true)
    try {
      await setScheduleActive(pendingToggle.id, !pendingToggle.isActive)
      setSchedules((prev) =>
        prev
          ? prev.map((s) => (s.id === pendingToggle.id ? { ...s, isActive: !s.isActive } : s))
          : prev,
      )
    } catch {
      setError('No se pudo actualizar el estado del horario.')
    } finally {
      setIsToggling(false)
      setPendingToggle(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!schedules) return <LoadingState label="Cargando horarios…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Horarios"
        subtitle="Gestiona los horarios de clase."
        action={
          <Link to="/admin/horarios/nuevo" className={cn(buttonVariants({ variant: 'default' }))}>
            Nuevo horario
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-5">
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
          value={instructorId}
          onChange={(e) => setInstructorId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={ALL}>Todos los instructores</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.firstName} {i.lastName}
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
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={ALL}>Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {filteredSchedules.length === 0 ? (
        <EmptyState title="No hay horarios con estos filtros" />
      ) : (
        <DataTable
          rows={filteredSchedules}
          getRowKey={(s) => s.id}
          columns={[
            { header: 'Sede', cell: (s) => s.venue?.name ?? '—' },
            { header: 'Programa', cell: (s) => s.program?.name ?? '—' },
            { header: 'Día', cell: (s) => DAY_LABELS[s.dayOfWeek] },
            { header: 'Hora', cell: (s) => formatScheduleRange(s.startTime, s.endTime) },
            {
              header: 'Instructor',
              cell: (s) =>
                s.leadInstructor
                  ? `${s.leadInstructor.firstName} ${s.leadInstructor.lastName}`
                  : '—',
            },
            {
              header: 'Cupo',
              cell: (s) => `${availabilityMap.get(s.id) ?? 0}/${s.maxCapacity}`,
            },
            {
              header: 'Estado',
              cell: (s) => (
                <StatusBadge
                  label={s.isActive ? 'Activo' : 'Inactivo'}
                  tone={s.isActive ? 'success' : 'neutral'}
                />
              ),
            },
            {
              header: 'Acciones',
              cell: (s) => (
                <div className="flex gap-3">
                  <Link
                    to={`/admin/horarios/${s.id}/editar`}
                    className="text-sky-700 hover:underline"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingToggle(s)}
                    className="text-slate-600 hover:underline"
                  >
                    {s.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={pendingToggle !== null}
        title={pendingToggle?.isActive ? 'Desactivar horario' : 'Activar horario'}
        description={
          pendingToggle
            ? `¿Confirmas ${pendingToggle.isActive ? 'desactivar' : 'activar'} este horario?`
            : undefined
        }
        confirmLabel={isToggling ? 'Guardando…' : 'Confirmar'}
        isDanger={pendingToggle?.isActive}
        onConfirm={handleConfirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  )
}
