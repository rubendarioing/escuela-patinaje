import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVenueBySlug, getSchedulesByVenueId } from '@/services/venues.service'
import type { Venue } from '@/types/venue'
import type { Schedule } from '@/types/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { ScheduleCard } from '@/features/schedules/ScheduleCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type VenueDetailData = {
  venue: Venue | null
  schedules: Schedule[]
}

export function VenueDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<VenueDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    getVenueBySlug(slug)
      .then(async (venue) => {
        if (cancelled) return
        const schedules = venue ? await getSchedulesByVenueId(venue.id) : []
        if (cancelled) return
        setData({ venue, schedules })
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudo cargar la sede.')
      })

    return () => {
      cancelled = true
    }
  }, [slug, retryKey])

  const handleRetry = () => {
    setError(null)
    setData(null)
    setRetryKey((key) => key + 1)
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!data) return <LoadingState label="Cargando sede…" />

  if (!data.venue) {
    return (
      <EmptyState
        title="Sede no encontrada"
        description="Puede que ya no esté disponible."
        action={
          <Link to="/sedes" className="text-sm text-sky-700 underline">
            Ver todas las sedes
          </Link>
        }
      />
    )
  }

  const { venue, schedules } = data

  return (
    <PageContainer>
      <SectionTitle title={venue.name} subtitle={venue.city ?? undefined} level="h1" />

      <p className="text-slate-600">{venue.address}</p>
      {venue.description && <p className="text-slate-600">{venue.description}</p>}

      {venue.googleMapsUrl && (
        <a
          href={venue.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-sky-700 underline"
        >
          Ver ubicación en el mapa
        </a>
      )}

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Horarios en esta sede</h2>
        {schedules.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Por ahora no hay horarios activos en esta sede.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        )}
      </section>

      <Link to="/inscripcion" className={cn(buttonVariants({ variant: 'default' }))}>
        Inscríbete
      </Link>
    </PageContainer>
  )
}
