import { Link } from 'react-router-dom'
import type { Schedule } from '@/types/schedule'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ScheduleCardProps = {
  schedule: Schedule
  enrollHref?: string
}

export function ScheduleCard({ schedule, enrollHref }: ScheduleCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{schedule.program?.name}</p>
      <p className="text-sm text-slate-600">{schedule.venue?.name}</p>
      <p className="mt-1 text-sm text-slate-500">
        {DAY_LABELS[schedule.dayOfWeek]} ·{' '}
        {formatScheduleRange(schedule.startTime, schedule.endTime)}
      </p>
      {schedule.leadInstructor && (
        <p className="mt-1 text-xs text-slate-400">
          Instructor: {schedule.leadInstructor.firstName} {schedule.leadInstructor.lastName}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Cupo máximo: {schedule.maxCapacity} · Cupos disponibles: por confirmar
      </p>
      {enrollHref && (
        <Link
          to={enrollHref}
          className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-3 w-full')}
        >
          Inscribirse
        </Link>
      )}
    </div>
  )
}
