import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllVenuesForAdmin, setVenueActive } from '@/services/venues.service'
import type { Venue } from '@/types/venue'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function VenuesListPage() {
  const [venues, setVenues] = useState<Venue[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [search, setSearch] = useState('')
  const [pendingToggle, setPendingToggle] = useState<Venue | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAllVenuesForAdmin()
      .then((result) => {
        if (cancelled) return
        setVenues(result)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar las sedes.')
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setVenues(null)
    setRetryKey((key) => key + 1)
  }

  const filteredVenues = useMemo(() => {
    if (!venues) return []
    const term = search.trim().toLowerCase()
    if (!term) return venues
    return venues.filter(
      (v) => v.name.toLowerCase().includes(term) || (v.city ?? '').toLowerCase().includes(term),
    )
  }, [venues, search])

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    setIsToggling(true)
    try {
      await setVenueActive(pendingToggle.id, !pendingToggle.isActive)
      setVenues((prev) =>
        prev
          ? prev.map((v) => (v.id === pendingToggle.id ? { ...v, isActive: !v.isActive } : v))
          : prev,
      )
    } catch {
      setError('No se pudo actualizar el estado de la sede.')
    } finally {
      setIsToggling(false)
      setPendingToggle(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!venues) return <LoadingState label="Cargando sedes…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sedes"
        subtitle="Gestiona las sedes de la escuela."
        action={
          <Link to="/admin/sedes/nueva" className={cn(buttonVariants({ variant: 'default' }))}>
            Nueva sede
          </Link>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o ciudad…" />

      {filteredVenues.length === 0 ? (
        <EmptyState
          title="No hay sedes que coincidan"
          description="Prueba con otro término de búsqueda."
        />
      ) : (
        <DataTable
          rows={filteredVenues}
          getRowKey={(v) => v.id}
          columns={[
            { header: 'Nombre', cell: (v) => v.name },
            { header: 'Ciudad', cell: (v) => v.city ?? '—' },
            {
              header: 'Estado',
              cell: (v) => (
                <StatusBadge
                  label={v.isActive ? 'Activa' : 'Inactiva'}
                  tone={v.isActive ? 'success' : 'neutral'}
                />
              ),
            },
            {
              header: 'Acciones',
              cell: (v) => (
                <div className="flex gap-3">
                  <Link to={`/admin/sedes/${v.id}/editar`} className="text-sky-700 hover:underline">
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingToggle(v)}
                    className="text-slate-600 hover:underline"
                  >
                    {v.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={pendingToggle !== null}
        title={pendingToggle?.isActive ? 'Desactivar sede' : 'Activar sede'}
        description={
          pendingToggle
            ? `¿Confirmas ${pendingToggle.isActive ? 'desactivar' : 'activar'} "${pendingToggle.name}"?`
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
