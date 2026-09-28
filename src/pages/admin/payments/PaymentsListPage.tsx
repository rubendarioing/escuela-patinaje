import { useEffect, useState } from 'react'
import {
  getPaymentStatusByAthlete,
  suggestNextPeriodStart,
  type AthletePaymentStatus,
} from '@/services/payments.service'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { RegisterPaymentDialog } from '@/pages/admin/payments/RegisterPaymentDialog'

export function PaymentsListPage() {
  const [statuses, setStatuses] = useState<AthletePaymentStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [dialogTarget, setDialogTarget] = useState<AthletePaymentStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    getPaymentStatusByAthlete()
      .then((result) => {
        if (!cancelled) setStatuses(result)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el estado de pagos.')
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setStatuses(null)
    setRetryKey((key) => key + 1)
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!statuses) return <LoadingState label="Cargando pagos…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pagos"
        subtitle="Mensualidad de $40.000 por deportista. Revisa quién está al día."
      />

      {statuses.length === 0 ? (
        <EmptyState title="No hay deportistas con inscripciones activas todavía" />
      ) : (
        <DataTable
          rows={statuses}
          getRowKey={(s) => s.athleteId}
          columns={[
            { header: 'Deportista', cell: (s) => s.athleteName },
            { header: 'Último pago', cell: (s) => s.lastPaymentDate ?? 'Sin pagos aún' },
            { header: 'Cubierto hasta', cell: (s) => s.coverageEnd ?? '—' },
            {
              header: 'Estado',
              cell: (s) => (
                <StatusBadge
                  label={s.isUpToDate ? 'Al día' : 'Pendiente'}
                  tone={s.isUpToDate ? 'success' : 'warning'}
                />
              ),
            },
            {
              header: 'Acciones',
              cell: (s) => (
                <button
                  type="button"
                  onClick={() => setDialogTarget(s)}
                  className="text-sky-700 hover:underline"
                >
                  Registrar pago
                </button>
              ),
            },
          ]}
        />
      )}

      {dialogTarget && (
        <RegisterPaymentDialog
          athleteId={dialogTarget.athleteId}
          athleteName={dialogTarget.athleteName}
          suggestedPeriodStart={suggestNextPeriodStart(dialogTarget)}
          onClose={() => setDialogTarget(null)}
          onSaved={() => {
            setDialogTarget(null)
            handleRetry()
          }}
        />
      )}
    </div>
  )
}
