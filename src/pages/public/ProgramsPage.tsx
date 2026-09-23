import { useEffect, useState } from 'react'
import { getPrograms } from '@/services/programs.service'
import type { Program } from '@/types/program'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { ProgramCard } from '@/features/programs/ProgramCard'

export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getPrograms()
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

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!programs) return <LoadingState label="Cargando programas…" />

  return (
    <PageContainer>
      <SectionTitle title="Programas" subtitle="Grupos disponibles en la escuela." level="h1" />
      {programs.length === 0 ? (
        <EmptyState title="No hay programas disponibles por ahora." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
