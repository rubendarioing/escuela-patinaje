import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { getVenues } from '@/services/venues.service'
import type { Venue } from '@/types/venue'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { Seo } from '@/components/common/Seo'
import { siteConfig, getWhatsAppUrl } from '@/lib/siteConfig'
import { InstagramIcon, FacebookIcon } from '@/components/common/SocialIcons'

export function ContactPage() {
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
        setError('No se pudo cargar la información de contacto.')
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
  if (!venues) return <LoadingState label="Cargando contacto…" />

  return (
    <PageContainer>
      <Seo
        title="Contacto"
        description="Escríbenos por WhatsApp o correo. Encuentra nuestras sedes en Zipaquirá."
      />
      <SectionTitle title="Contacto" subtitle="Escríbenos por WhatsApp o correo." level="h1" />

      <section className="grid gap-4 sm:grid-cols-2">
        <a
          href={getWhatsAppUrl('Hola, quiero información sobre la escuela de patinaje.')}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-200 p-4 hover:border-sky-300 hover:shadow-sm"
        >
          <p className="font-semibold text-slate-900">WhatsApp</p>
          <p className="mt-1 text-sm text-slate-600">Respuesta rápida durante el día.</p>
        </a>

        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="flex items-start gap-2 rounded-lg border border-slate-200 p-4 hover:border-sky-300 hover:shadow-sm"
        >
          <Mail className="mt-0.5 h-5 w-5 text-slate-500" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">Correo</p>
            <p className="mt-1 text-sm text-slate-600">{siteConfig.contactEmail}</p>
          </div>
        </a>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Sedes</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <div key={venue.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{venue.name}</p>
              <p className="mt-1 text-sm text-slate-600">{venue.address}</p>
              {venue.city && <p className="text-sm text-slate-500">{venue.city}</p>}
              {venue.googleMapsUrl && (
                <a
                  href={venue.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-sky-700 underline"
                >
                  Ver ubicación en el mapa
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Síguenos</h2>
        <div className="mt-2 flex gap-3">
          {siteConfig.social.instagram ? (
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <InstagramIcon className="h-6 w-6 hover:text-sky-700" />
            </a>
          ) : (
            <InstagramIcon
              className="h-6 w-6 text-slate-300"
              aria-label="Instagram (próximamente)"
            />
          )}
          {siteConfig.social.facebook ? (
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FacebookIcon className="h-6 w-6 hover:text-sky-700" />
            </a>
          ) : (
            <FacebookIcon className="h-6 w-6 text-slate-300" aria-label="Facebook (próximamente)" />
          )}
        </div>
      </section>
    </PageContainer>
  )
}
