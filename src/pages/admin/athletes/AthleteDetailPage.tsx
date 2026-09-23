import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getAthleteDetail,
  unlinkGuardianFromAthlete,
  setPrimaryGuardian,
  type AthleteDetail,
  type AthleteGuardianLink,
} from '@/services/athletes.service'
import { ATHLETE_STATUS_OPTIONS } from '@/lib/validations/athlete.schema'
import { calculateAge } from '@/lib/utils/age'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LinkGuardianDialog } from '@/pages/admin/athletes/LinkGuardianDialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger' | 'info'> = {
  prospect: 'warning',
  active: 'success',
  inactive: 'neutral',
  withdrawn: 'danger',
  pending: 'warning',
  confirmed: 'info',
  cancelled: 'danger',
  completed: 'neutral',
}

export function AthleteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<AthleteDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [pendingUnlink, setPendingUnlink] = useState<AthleteGuardianLink | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    getAthleteDetail(id)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setError('Ese deportista no existe.')
          return
        }
        setDetail(result)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudo cargar el deportista.')
      })

    return () => {
      cancelled = true
    }
  }, [id, retryKey])

  const refetch = () => {
    setError(null)
    setDetail(null)
    setRetryKey((k) => k + 1)
  }

  const handleUnlink = async () => {
    if (!id || !pendingUnlink) return
    setIsUnlinking(true)
    try {
      await unlinkGuardianFromAthlete(id, pendingUnlink.guardianId)
      refetch()
    } catch {
      setError('No se pudo desvincular al acudiente.')
    } finally {
      setIsUnlinking(false)
      setPendingUnlink(null)
    }
  }

  const handleSetPrimary = async (guardianId: string) => {
    if (!id) return
    setSettingPrimaryId(guardianId)
    try {
      await setPrimaryGuardian(id, guardianId)
      refetch()
    } catch {
      setError('No se pudo actualizar el acudiente principal.')
    } finally {
      setSettingPrimaryId(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!detail) return <LoadingState label="Cargando deportista…" />

  const { athlete } = detail

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${athlete.firstName} ${athlete.lastName}`}
        subtitle={`${calculateAge(athlete.birthDate)} años · Origen: ${athlete.source === 'web_form' ? 'Formulario web' : 'Panel admin'}`}
        action={
          <Link
            to={`/admin/deportistas/${athlete.id}/editar`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            Editar datos
          </Link>
        }
      />

      <section className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Estado</p>
          <StatusBadge
            label={
              ATHLETE_STATUS_OPTIONS.find((o) => o.value === athlete.status)?.label ??
              athlete.status
            }
            tone={STATUS_TONE[athlete.status] ?? 'neutral'}
          />
        </div>
        <div>
          <p className="text-xs text-slate-500">Documento</p>
          <p className="text-sm text-slate-900">
            {athlete.documentNumber
              ? `${detail.documentTypeName} · ${athlete.documentNumber}`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Fecha de nacimiento</p>
          <p className="text-sm text-slate-900">{athlete.birthDate}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Tipo de sangre</p>
          <p className="text-sm text-slate-900">{athlete.bloodType ?? '—'}</p>
        </div>
        {athlete.notes && (
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Notas</p>
            <p className="text-sm text-slate-900">{athlete.notes}</p>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Acudientes</h2>
          <button
            type="button"
            onClick={() => setIsLinkDialogOpen(true)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Vincular acudiente
          </button>
        </div>

        {detail.guardians.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sin acudientes asociados todavía.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {detail.guardians.map((g) => (
              <li key={g.guardianId} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {g.firstName} {g.lastName}{' '}
                    {g.isPrimary && <span className="text-xs text-sky-700">(principal)</span>}
                  </p>
                  <p className="text-slate-500">
                    {g.relationship} · {g.phone ?? g.whatsapp ?? g.email ?? 'sin contacto'}
                  </p>
                </div>
                <div className="flex gap-3">
                  {!g.isPrimary && (
                    <button
                      type="button"
                      onClick={() => void handleSetPrimary(g.guardianId)}
                      disabled={settingPrimaryId === g.guardianId}
                      className="text-sky-700 hover:underline disabled:opacity-50"
                    >
                      {settingPrimaryId === g.guardianId ? 'Guardando…' : 'Marcar como principal'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingUnlink(g)}
                    className="text-red-600 hover:underline"
                  >
                    Desvincular
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Inscripciones e historial</h2>
        {detail.registrations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sin inscripciones registradas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {detail.registrations.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {r.programName ?? '—'} · {r.venueName ?? '—'}
                  </p>
                  <p className="text-slate-500">
                    {DAY_LABELS[r.dayOfWeek] ?? '—'} · {formatScheduleRange(r.startTime, r.endTime)}{' '}
                    · {r.source}
                  </p>
                </div>
                <StatusBadge label={r.status} tone={STATUS_TONE[r.status] ?? 'neutral'} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {id && isLinkDialogOpen && (
        <LinkGuardianDialog
          athleteId={id}
          excludeGuardianIds={detail.guardians.map((g) => g.guardianId)}
          onLinked={() => {
            setIsLinkDialogOpen(false)
            refetch()
          }}
          onClose={() => setIsLinkDialogOpen(false)}
        />
      )}

      <ConfirmDialog
        open={pendingUnlink !== null}
        title="Desvincular acudiente"
        description={
          pendingUnlink
            ? `¿Confirmas desvincular a ${pendingUnlink.firstName} ${pendingUnlink.lastName}?`
            : undefined
        }
        confirmLabel={isUnlinking ? 'Guardando…' : 'Confirmar'}
        isDanger
        onConfirm={handleUnlink}
        onCancel={() => setPendingUnlink(null)}
      />
    </div>
  )
}
