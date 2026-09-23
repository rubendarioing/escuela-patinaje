import { useEffect, useMemo, useState } from 'react'
import {
  getAllRegistrationsForAdmin,
  setRegistrationStatus,
  REGISTRATION_STATUS_OPTIONS,
  type RegistrationListItem,
} from '@/services/registrations.service'
import { getScheduleAvailability } from '@/services/schedules.service'
import { getVenues } from '@/services/venues.service'
import { getPrograms } from '@/services/programs.service'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

const ALL = 'all'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  active: 'success',
  cancelled: 'danger',
  completed: 'neutral',
}

const STATUS_LABEL = (status: string) =>
  REGISTRATION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status

// Próximo estado sugerido por cada botón de acción rápida
const NEXT_ACTIONS: Record<string, { status: string; label: string; isDanger?: boolean }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar' },
    { status: 'cancelled', label: 'Cancelar', isDanger: true },
  ],
  confirmed: [
    { status: 'active', label: 'Activar' },
    { status: 'cancelled', label: 'Cancelar', isDanger: true },
  ],
  active: [
    { status: 'completed', label: 'Finalizar' },
    { status: 'cancelled', label: 'Cancelar', isDanger: true },
  ],
  cancelled: [],
  completed: [],
}

// Estos dos pasos ocupan un cupo del horario (D6); ahí se muestra la advertencia
const CAPACITY_SENSITIVE_STATUSES = new Set(['confirmed', 'active'])

type PendingAction = {
  registration: RegistrationListItem
  nextStatus: string
  label: string
  isDanger?: boolean
}

export function RegistrationsListPage() {
  const [registrations, setRegistrations] = useState<RegistrationListItem[] | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, number>>(new Map())
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [statusFilter, setStatusFilter] = useState(ALL)
  const [venueFilter, setVenueFilter] = useState(ALL)
  const [programFilter, setProgramFilter] = useState(ALL)
  const [dateFilter, setDateFilter] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getAllRegistrationsForAdmin(),
      getScheduleAvailability(),
      getVenues(),
      getPrograms(),
    ])
      .then(([registrationResult, availabilityResult, venueResult, programResult]) => {
        if (cancelled) return
        setRegistrations(registrationResult)
        setAvailabilityMap(new Map(availabilityResult.map((a) => [a.scheduleId, a.availableSpots])))
        setVenues(venueResult)
        setPrograms(programResult)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar las inscripciones.')
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setRegistrations(null)
    setRetryKey((key) => key + 1)
  }

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return []
    return registrations.filter((r) => {
      if (pendingOnly) return r.status === 'pending' && r.source === 'web_form'
      if (statusFilter !== ALL && r.status !== statusFilter) return false
      if (venueFilter !== ALL && r.venueId !== venueFilter) return false
      if (programFilter !== ALL && r.programId !== programFilter) return false
      if (dateFilter && r.registrationDate !== dateFilter) return false
      return true
    })
  }, [registrations, pendingOnly, statusFilter, venueFilter, programFilter, dateFilter])

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    setIsSaving(true)
    try {
      await setRegistrationStatus(pendingAction.registration.id, pendingAction.nextStatus)
      setRegistrations((prev) =>
        prev
          ? prev.map((r) =>
              r.id === pendingAction.registration.id
                ? { ...r, status: pendingAction.nextStatus }
                : r,
            )
          : prev,
      )
    } catch {
      setError('No se pudo actualizar la inscripción.')
    } finally {
      setIsSaving(false)
      setPendingAction(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!registrations) return <LoadingState label="Cargando inscripciones…" />

  const isCapacityFull = pendingAction
    ? (availabilityMap.get(pendingAction.registration.scheduleId) ?? 1) <= 0
    : false
  const showCapacityWarning = Boolean(
    pendingAction && CAPACITY_SENSITIVE_STATUSES.has(pendingAction.nextStatus) && isCapacityFull,
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Inscripciones" subtitle="Gestiona las inscripciones y preinscripciones." />

      <button
        type="button"
        onClick={() => setPendingOnly((prev) => !prev)}
        className={`rounded-md border px-3 py-2 text-sm font-medium ${
          pendingOnly ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-300 text-slate-600'
        }`}
      >
        {pendingOnly
          ? 'Viendo solo preinscripciones pendientes ✕'
          : 'Ver solo preinscripciones pendientes'}
      </button>

      {!pendingOnly && (
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={ALL}>Todos los estados</option>
            {REGISTRATION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
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
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={ALL}>Todos los programas</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      {filteredRegistrations.length === 0 ? (
        <EmptyState title="No hay inscripciones con estos filtros" />
      ) : (
        <DataTable
          rows={filteredRegistrations}
          getRowKey={(r) => r.id}
          columns={[
            { header: 'Deportista', cell: (r) => r.athleteName },
            { header: 'Programa', cell: (r) => r.programName },
            { header: 'Sede', cell: (r) => r.venueName },
            {
              header: 'Horario',
              cell: (r) =>
                `${DAY_LABELS[r.dayOfWeek] ?? '—'} · ${formatScheduleRange(r.startTime, r.endTime)}`,
            },
            { header: 'Fecha', cell: (r) => r.registrationDate },
            {
              header: 'Estado',
              cell: (r) => (
                <StatusBadge
                  label={STATUS_LABEL(r.status)}
                  tone={STATUS_TONE[r.status] ?? 'neutral'}
                />
              ),
            },
            { header: 'Origen', cell: (r) => (r.source === 'web_form' ? 'Web' : 'Admin') },
            {
              header: 'Acciones',
              cell: (r) => (
                <div className="flex gap-3">
                  {NEXT_ACTIONS[r.status]?.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          registration: r,
                          nextStatus: action.status,
                          label: action.label,
                          isDanger: action.isDanger,
                        })
                      }
                      className={
                        action.isDanger
                          ? 'text-red-600 hover:underline'
                          : 'text-sky-700 hover:underline'
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                  {NEXT_ACTIONS[r.status]?.length === 0 && (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={`${pendingAction?.label} inscripción`}
        description={
          showCapacityWarning
            ? `Este horario ya está en su cupo máximo. ¿Confirmas ${pendingAction?.label.toLowerCase()} de todas formas?`
            : `¿Confirmas ${pendingAction?.label.toLowerCase()} la inscripción de ${pendingAction?.registration.athleteName}?`
        }
        confirmLabel={isSaving ? 'Guardando…' : 'Confirmar'}
        isDanger={pendingAction?.isDanger || showCapacityWarning}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
