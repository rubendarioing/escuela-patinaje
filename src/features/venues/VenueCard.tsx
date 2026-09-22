import type { Venue } from '@/types/venue'

type VenueCardProps = {
  venue: Venue
}

export function VenueCard({ venue }: VenueCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{venue.name}</p>
      <p className="mt-1 text-sm text-slate-600">{venue.address}</p>
      {venue.city && <p className="text-sm text-slate-500">{venue.city}</p>}
    </div>
  )
}
