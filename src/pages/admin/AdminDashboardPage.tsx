import { useEffect, useState } from 'react'
import {
  getDashboardMetrics,
  getRecentRegistrations,
  type DashboardMetrics,
  type RecentRegistration,
} from '@/services/adminDashboard.service'
import { getUpcomingSchedules } from '@/services/schedules.service'
import type { Schedule } from '@/types/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'

type DashboardData = {
  metrics: DashboardMetrics
  recentRegistrations: RecentRegistration[]
  upcomingSchedules: Schedule[]
}

const METRIC_LABELS: { key: keyof DashboardMetrics; label: string }[] = [
  { key: 'activeAthletes', label: 'Deportistas activos' },
  { key: 'activeVenues', label: 'Sedes' },
  { key: 'activeInstructors', label: 'Instructores' },
  { key: 'activeSchedules', label: 'Horarios activos' },
  { key: 'pendingPreregistrations', label: 'Preinscripciones pendientes' },
]

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.all([getDashboardMetrics(), getRecentRegistrations(), getUpcomingSchedules()])
      .then(([metrics, recentRegistrations, upcomingSchedules]) => {
        if (cancelled) return
        setData({ metrics, recentRegistrations, upcomingSchedules })
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudo cargar el dashboard.')
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setData(null)
    setRetryKey((key) => key + 1)
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!data) return <LoadingState label="Cargando dashboard…" />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Resumen general de la escuela.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {METRIC_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-slate-200 p-4">
            <p className="text-2xl font-bold text-slate-900">{data.metrics[key]}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Últimas inscripciones</h2>
          {data.recentRegistrations.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Todavía no hay inscripciones.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {data.recentRegistrations.map((r) => (
                <li key={r.id} className="p-3 text-sm">
                  <p className="font-medium text-slate-900">{r.athleteName}</p>
                  <p className="text-slate-500">
                    {r.programName} · {r.venueName} · {r.status} · {r.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Próximos horarios</h2>
          {data.upcomingSchedules.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No hay horarios activos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {data.upcomingSchedules.map((s) => (
                <li key={s.id} className="p-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {s.program?.name} · {s.venue?.name}
                  </p>
                  <p className="text-slate-500">
                    {DAY_LABELS[s.dayOfWeek]} · {formatScheduleRange(s.startTime, s.endTime)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
