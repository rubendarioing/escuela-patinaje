import type { Schedule } from '@/types/schedule'
import { DAY_LABELS, formatScheduleRange } from '@/lib/utils/schedule'

type ScheduleCardProps = {
  schedule: Schedule
}

export function ScheduleCard({ schedule }: ScheduleCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
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
    </div>
  )
}
