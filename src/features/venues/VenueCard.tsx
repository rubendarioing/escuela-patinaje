import { Link } from 'react-router-dom'
import type { Venue } from '@/types/venue'

type VenueCardProps = {
  venue: Venue
}

export function VenueCard({ venue }: VenueCardProps) {
  return (
    <Link
      to={`/sedes/${venue.slug}`}
      className="block overflow-hidden rounded-lg border border-slate-200 transition hover:border-sky-300 hover:shadow-sm"
    >
      {venue.imageUrl && (
        <img
          src={venue.imageUrl}
          alt={venue.name}
          loading="lazy"
          decoding="async"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="p-4">
        <p className="font-semibold text-slate-900">{venue.name}</p>
        <p className="mt-1 text-sm text-slate-600">{venue.address}</p>
        {venue.city && <p className="text-sm text-slate-500">{venue.city}</p>}
      </div>
    </Link>
  )
}
