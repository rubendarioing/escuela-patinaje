import { useEffect, useState } from 'react'
import { getVenues } from '@/services/venues.service'
import type { Venue } from '@/types/venue'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { VenueCard } from '@/features/venues/VenueCard'

export function VenuesPage() {
  const [venues, setVenues] = useState<Venue[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getVenues()
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

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!venues) return <LoadingState label="Cargando sedes…" />

  return (
    <PageContainer>
      <SectionTitle title="Sedes" subtitle="Puntos de entrenamiento de la escuela." level="h1" />
      {venues.length === 0 ? (
        <EmptyState title="No hay sedes disponibles por ahora." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
