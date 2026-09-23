import { useEffect, useMemo, useState } from 'react'
import { getAllGuardiansForAdmin, type GuardianListItem } from '@/services/guardians.service'
import { linkGuardianToAthlete } from '@/services/athletes.service'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RELATIONSHIP_OPTIONS = [
  { value: 'mother', label: 'Madre' },
  { value: 'father', label: 'Padre' },
  { value: 'grandmother', label: 'Abuela' },
  { value: 'grandfather', label: 'Abuelo' },
  { value: 'guardian', label: 'Acudiente' },
  { value: 'other', label: 'Otro' },
]

type LinkGuardianDialogProps = {
  athleteId: string
  excludeGuardianIds: string[]
  onLinked: () => void
  onClose: () => void
}

export function LinkGuardianDialog({
  athleteId,
  excludeGuardianIds,
  onLinked,
  onClose,
}: LinkGuardianDialogProps) {
  const [guardians, setGuardians] = useState<GuardianListItem[] | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [relationship, setRelationship] = useState('guardian')
  const [isPrimary, setIsPrimary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    getAllGuardiansForAdmin()
      .then((result) => {
        if (!cancelled) setGuardians(result)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los acudientes.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredGuardians = useMemo(() => {
    if (!guardians) return []
    const term = search.trim().toLowerCase()
    return guardians
      .filter((g) => !excludeGuardianIds.includes(g.id))
      .filter(
        (g) =>
          term === '' ||
          g.firstName.toLowerCase().includes(term) ||
          g.lastName.toLowerCase().includes(term) ||
          (g.phone ?? '').includes(term) ||
          (g.email ?? '').toLowerCase().includes(term),
      )
  }, [guardians, search, excludeGuardianIds])

  const handleSubmit = async () => {
    if (!selectedId) {
      setError('Elige un acudiente de la lista.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await linkGuardianToAthlete(athleteId, selectedId, relationship, isPrimary)
      onLinked()
    } catch {
      setError('No se pudo vincular. Puede que ya esté asociado a este deportista.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vincular acudiente"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Vincular acudiente</h2>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o correo…"
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
          {!guardians ? (
            <p className="p-2 text-sm text-slate-500">Cargando…</p>
          ) : filteredGuardians.length === 0 ? (
            <p className="p-2 text-sm text-slate-500">
              Sin resultados. Crea el acudiente primero desde "Acudientes".
            </p>
          ) : (
            filteredGuardians.map((g) => (
              <label key={g.id} className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-slate-50">
                <input
                  type="radio"
                  name="guardian"
                  checked={selectedId === g.id}
                  onChange={() => setSelectedId(g.id)}
                />
                <span>
                  {g.firstName} {g.lastName} <span className="text-slate-400">{g.phone ?? g.email ?? ''}</span>
                </span>
              </label>
            ))
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Relación
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Es el acudiente principal
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className={cn(buttonVariants({ variant: 'default' }), 'disabled:opacity-50')}
          >
            {isSubmitting ? 'Vinculando…' : 'Vincular'}
          </button>
        </div>
      </div>
    </div>
  )
}
