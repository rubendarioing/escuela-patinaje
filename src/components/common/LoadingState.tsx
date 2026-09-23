type LoadingStateProps = {
  label?: string
}

export function LoadingState({ label = 'Cargando…' }: LoadingStateProps) {
  return (
    <div
      role="status"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-3 py-12"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-700"
        aria-hidden="true"
      />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}
