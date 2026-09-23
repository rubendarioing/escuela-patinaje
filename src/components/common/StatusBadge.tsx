type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-sky-100 text-sky-700',
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  )
}
