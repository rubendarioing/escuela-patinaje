import type { InputHTMLAttributes } from 'react'

type DateFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function DateField({ label, error, id, ...props }: DateFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
