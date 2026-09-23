import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAllInstructorsForAdmin,
  setInstructorActive,
  type AdminInstructor,
} from '@/services/instructors.service'
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

export function InstructorsListPage() {
  const [instructors, setInstructors] = useState<AdminInstructor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [search, setSearch] = useState('')
  const [pendingToggle, setPendingToggle] = useState<AdminInstructor | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAllInstructorsForAdmin()
      .then((result) => {
        if (cancelled) return
        setInstructors(result)
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar los instructores.')
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setInstructors(null)
    setRetryKey((key) => key + 1)
  }

  const filteredInstructors = useMemo(() => {
    if (!instructors) return []
    const term = search.trim().toLowerCase()
    if (!term) return instructors
    return instructors.filter(
      (i) =>
        i.firstName.toLowerCase().includes(term) ||
        i.lastName.toLowerCase().includes(term) ||
        (i.specialty ?? '').toLowerCase().includes(term),
    )
  }, [instructors, search])

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    setIsToggling(true)
    try {
      await setInstructorActive(pendingToggle.id, !pendingToggle.isActive)
      setInstructors((prev) =>
        prev
          ? prev.map((i) => (i.id === pendingToggle.id ? { ...i, isActive: !i.isActive } : i))
          : prev,
      )
    } catch {
      setError('No se pudo actualizar el estado del instructor.')
    } finally {
      setIsToggling(false)
      setPendingToggle(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!instructors) return <LoadingState label="Cargando instructores…" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Instructores"
        subtitle="Gestiona el equipo de instructores."
        action={
          <Link
            to="/admin/instructores/nuevo"
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            Nuevo instructor
          </Link>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre o especialidad…"
      />

      {filteredInstructors.length === 0 ? (
        <EmptyState
          title="No hay instructores que coincidan"
          description="Prueba con otro término de búsqueda."
        />
      ) : (
        <DataTable
          rows={filteredInstructors}
          getRowKey={(i) => i.id}
          columns={[
            { header: 'Nombre', cell: (i) => `${i.firstName} ${i.lastName}` },
            { header: 'Especialidad', cell: (i) => i.specialty ?? '—' },
            {
              header: 'Estado',
              cell: (i) => (
                <StatusBadge
                  label={i.isActive ? 'Activo' : 'Inactivo'}
                  tone={i.isActive ? 'success' : 'neutral'}
                />
              ),
            },
            {
              header: 'Acciones',
              cell: (i) => (
                <div className="flex gap-3">
                  <Link
                    to={`/admin/instructores/${i.id}/editar`}
                    className="text-sky-700 hover:underline"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingToggle(i)}
                    className="text-slate-600 hover:underline"
                  >
                    {i.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={pendingToggle !== null}
        title={pendingToggle?.isActive ? 'Desactivar instructor' : 'Activar instructor'}
        description={
          pendingToggle
            ? `¿Confirmas ${pendingToggle.isActive ? 'desactivar' : 'activar'} a "${pendingToggle.firstName} ${pendingToggle.lastName}"?`
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
