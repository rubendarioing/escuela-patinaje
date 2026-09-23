import { Link } from 'react-router-dom'
import type { Schedule } from '@/types/schedule'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ScheduleCardProps = {
  schedule: Schedule
  enrollHref?: string
  availableSpots?: number
}

export function ScheduleCard({ schedule, enrollHref, availableSpots }: ScheduleCardProps) {
  const isFull = availableSpots === 0

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{schedule.program?.name}</p>
      <p className="text-sm text-slate-600">{schedule.venue?.name}</p>
      <p className="mt-1 text-sm text-slate-500">
        {DAY_LABELS[schedule.dayOfWeek]} ·{' '}
        {formatScheduleRange(schedule.startTime, schedule.endTime)}
      </p>
      {schedule.leadInstructor && (
        <p className="mt-1 text-xs text-slate-600">
          Instructor: {schedule.leadInstructor.firstName} {schedule.leadInstructor.lastName}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Cupo máximo: {schedule.maxCapacity} ·{' '}
        {availableSpots === undefined
          ? 'Cupos disponibles: por confirmar'
          : isFull
            ? 'Sin cupos disponibles'
            : `Cupos disponibles: ${availableSpots}`}
      </p>
      {enrollHref &&
        (isFull ? (
          <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
            No hay cupo en este horario. Escríbenos por WhatsApp para buscar otra opción.
          </p>
        ) : (
          <Link
            to={enrollHref}
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-3 w-full')}
          >
            Inscribirse
          </Link>
        ))}
    </div>
  )
}
