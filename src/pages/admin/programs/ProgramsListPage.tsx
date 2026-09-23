import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllProgramsForAdmin, setProgramActive } from '@/services/programs.service'
import { PROGRAM_LEVEL_OPTIONS } from '@/lib/validations/program.schema'
import type { Program } from '@/types/program'
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

const levelLabel = (level: Program['level']) =>
  PROGRAM_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? '—'

const ageRangeLabel = (minAge: number | null, maxAge: number | null) => {
  if (minAge != null && maxAge != null) return `${minAge} a ${maxAge} años`
  if (minAge != null) return `Desde ${minAge} años`
  if (maxAge != null) return `Hasta ${maxAge} años`
  return 'Todas las edades'
}

export function ProgramsListPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [search, setSearch] = useState('')
  const [pendingToggle, setPendingToggle] = useState<Program | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAllProgramsForAdmin()
      .then((result) => {
        if (cancelled) return
        setPrograms(result)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar los programas.')
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setPrograms(null)
    setRetryKey((key) => key + 1)
  }

  const filteredPrograms = useMemo(() => {
    if (!programs) return []
    const term = search.trim().toLowerCase()
    if (!term) return programs
    return programs.filter((p) => p.name.toLowerCase().includes(term))
  }, [programs, search])

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    setIsToggling(true)
    try {
      await setProgramActive(pendingToggle.id, !pendingToggle.isActive)
      setPrograms((prev) =>
        prev
          ? prev.map((p) => (p.id === pendingToggle.id ? { ...p, isActive: !p.isActive } : p))
          : prev,
      )
    } catch {
      setError('No se pudo actualizar el estado del programa.')
    } finally {
      setIsToggling(false)
      setPendingToggle(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!programs) return <LoadingState label="Cargando programas…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Programas"
        subtitle="Gestiona los programas de la escuela."
        action={
          <Link to="/admin/programas/nuevo" className={cn(buttonVariants({ variant: 'default' }))}>
            Nuevo programa
          </Link>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre…" />

      {filteredPrograms.length === 0 ? (
        <EmptyState
          title="No hay programas que coincidan"
          description="Prueba con otro término de búsqueda."
        />
      ) : (
        <DataTable
          rows={filteredPrograms}
          getRowKey={(p) => p.id}
          columns={[
            { header: 'Nombre', cell: (p) => p.name },
            { header: 'Nivel', cell: (p) => levelLabel(p.level) },
            { header: 'Edad', cell: (p) => ageRangeLabel(p.minAge, p.maxAge) },
            {
              header: 'Estado',
              cell: (p) => (
                <StatusBadge
                  label={p.isActive ? 'Activo' : 'Inactivo'}
                  tone={p.isActive ? 'success' : 'neutral'}
                />
              ),
            },
            {
              header: 'Acciones',
              cell: (p) => (
                <div className="flex gap-3">
                  <Link
                    to={`/admin/programas/${p.id}/editar`}
                    className="text-sky-700 hover:underline"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingToggle(p)}
                    className="text-slate-600 hover:underline"
                  >
                    {p.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={pendingToggle !== null}
        title={pendingToggle?.isActive ? 'Desactivar programa' : 'Activar programa'}
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
