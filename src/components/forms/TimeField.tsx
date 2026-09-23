import type { InputHTMLAttributes } from 'react'

type TimeFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function TimeField({ label, error, id, ...props }: TimeFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="time"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
