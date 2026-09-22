type ErrorStateProps = {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'Ocurrió un error. Inténtalo de nuevo.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
