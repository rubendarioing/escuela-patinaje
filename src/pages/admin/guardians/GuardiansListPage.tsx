import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllGuardiansForAdmin, type GuardianListItem } from '@/services/guardians.service'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function GuardiansListPage() {
  const [guardians, setGuardians] = useState<GuardianListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    getAllGuardiansForAdmin()
      .then((result) => {
        if (cancelled) return
        setGuardians(result)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar los acudientes.')
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setGuardians(null)
    setRetryKey((key) => key + 1)
  }

  const filteredGuardians = useMemo(() => {
    if (!guardians) return []
    const term = search.trim().toLowerCase()
    if (!term) return guardians
    return guardians.filter(
      (g) =>
        g.firstName.toLowerCase().includes(term) ||
        g.lastName.toLowerCase().includes(term) ||
        (g.phone ?? '').includes(term) ||
        (g.email ?? '').toLowerCase().includes(term),
    )
  }, [guardians, search])

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!guardians) return <LoadingState label="Cargando acudientes…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Acudientes"
        subtitle="Gestiona los acudientes registrados."
        action={
          <Link to="/admin/acudientes/nuevo" className={cn(buttonVariants({ variant: 'default' }))}>
            Nuevo acudiente
          </Link>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre, teléfono o correo…"
      />

      {filteredGuardians.length === 0 ? (
        <EmptyState
          title="No hay acudientes que coincidan"
          description="Prueba con otro término de búsqueda."
        />
      ) : (
        <DataTable
          rows={filteredGuardians}
          getRowKey={(g) => g.id}
          columns={[
            { header: 'Nombre', cell: (g) => `${g.firstName} ${g.lastName}` },
            {
              header: 'Contacto',
              cell: (g) => (
                <div className="text-xs text-slate-500">
                  {g.phone && <div>Tel: {g.phone}</div>}
                  {g.whatsapp && <div>WhatsApp: {g.whatsapp}</div>}
                  {g.email && <div>{g.email}</div>}
                  {!g.phone && !g.whatsapp && !g.email && '—'}
                </div>
              ),
            },
            {
              header: 'Deportistas asociados',
              cell: (g) => (g.athleteNames.length > 0 ? g.athleteNames.join(', ') : '—'),
            },
            {
              header: 'Consentimiento',
              cell: (g) =>
                g.dataConsentAt ? (
                  <StatusBadge
                    label={`${new Date(g.dataConsentAt).toLocaleDateString('es-CO')} · ${g.dataConsentVersion}`}
                    tone="success"
                  />
                ) : (
                  <StatusBadge label="Sin registrar" tone="neutral" />
                ),
            },
            {
              header: 'Acciones',
              cell: (g) => (
                <Link
                  to={`/admin/acudientes/${g.id}/editar`}
                  className="text-sky-700 hover:underline"
                >
                  Editar
                </Link>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
