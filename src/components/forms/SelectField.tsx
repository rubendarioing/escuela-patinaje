import type { SelectHTMLAttributes } from 'react'

type Option = { value: string; label: string }

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: Option[]
  placeholder?: string
  error?: string
}

export function SelectField({
  label,
  options,
  placeholder,
  error,
  id,
  ...props
}: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
