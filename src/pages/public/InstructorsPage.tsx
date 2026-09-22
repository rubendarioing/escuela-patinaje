import { useEffect, useState } from 'react'
import { getInstructors } from '@/services/instructors.service'
import type { Instructor } from '@/types/instructor'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { InstructorCard } from '@/features/instructors/InstructorCard'

export function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getInstructors()
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

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!instructors) return <LoadingState label="Cargando instructores…" />

  return (
    <PageContainer>
      <SectionTitle title="Instructores" subtitle="El equipo que acompaña a los deportistas." />
      {instructors.length === 0 ? (
        <EmptyState title="No hay instructores disponibles por ahora." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
