import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllAthletesForAdmin, type AthleteListItem } from '@/services/athletes.service'
import { ATHLETE_STATUS_OPTIONS } from '@/lib/validations/athlete.schema'
import { calculateAge } from '@/lib/utils/age'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALL = 'all'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  prospect: 'warning',
  active: 'success',
  inactive: 'neutral',
  withdrawn: 'danger',
}

export function AthletesListPage() {
  const [athletes, setAthletes] = useState<AthleteListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL)

  useEffect(() => {
    let cancelled = false
    getAllAthletesForAdmin()
      .then((result) => {
        if (cancelled) return
        setAthletes(result)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar los deportistas.')
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setAthletes(null)
    setRetryKey((key) => key + 1)
  }

  const filteredAthletes = useMemo(() => {
    if (!athletes) return []
    const term = search.trim().toLowerCase()
    return athletes.filter((a) => {
      if (status !== ALL && a.status !== status) return false
      if (!term) return true
      return (
        a.firstName.toLowerCase().includes(term) ||
        a.lastName.toLowerCase().includes(term) ||
        (a.documentNumber ?? '').toLowerCase().includes(term)
      )
    })
  }, [athletes, search, status])

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!athletes) return <LoadingState label="Cargando deportistas…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deportistas"
        subtitle="Gestiona los deportistas de la escuela."
        action={
          <Link
            to="/admin/deportistas/nuevo"
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            Nuevo deportista
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, apellido o documento…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={ALL}>Todos los estados</option>
          {ATHLETE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {filteredAthletes.length === 0 ? (
        <EmptyState
          title="No hay deportistas que coincidan"
          description="Prueba con otro término de búsqueda."
        />
      ) : (
        <DataTable
          rows={filteredAthletes}
          getRowKey={(a) => a.id}
          columns={[
            { header: 'Nombre', cell: (a) => `${a.firstName} ${a.lastName}` },
            { header: 'Edad', cell: (a) => `${calculateAge(a.birthDate)} años` },
            {
              header: 'Documento',
              cell: (a) => (a.documentNumber ? `${a.documentType} ${a.documentNumber}` : '—'),
            },
            {
              header: 'Estado',
              cell: (a) => (
                <StatusBadge
                  label={
                    ATHLETE_STATUS_OPTIONS.find((o) => o.value === a.status)?.label ?? a.status
                  }
                  tone={STATUS_TONE[a.status] ?? 'neutral'}
                />
              ),
            },
            { header: 'Programa actual', cell: (a) => a.currentProgramName ?? '—' },
            { header: 'Sede', cell: (a) => a.currentVenueName ?? '—' },
            {
              header: 'Acciones',
              cell: (a) => (
                <Link to={`/admin/deportistas/${a.id}`} className="text-sky-700 hover:underline">
                  Ver detalle
                </Link>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
