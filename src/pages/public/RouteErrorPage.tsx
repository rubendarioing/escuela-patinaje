import { Link, useRouteError } from 'react-router-dom'

// Cuando falta un archivo de una página (sin conexión, o una versión nueva
// publicada que cambió los nombres de los archivos), la descarga del "pedazo"
// de esa página falla con este mensaje característico.
const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error && /failed to fetch dynamically imported module/i.test(error.message)

export function RouteErrorPage() {
  const error = useRouteError()
  console.error('Error de ruta no controlado:', error)

  const chunkLoadError = isChunkLoadError(error)

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
      <p className="text-sm text-slate-600">
        {chunkLoadError
          ? 'No pudimos cargar esta página. Puede ser que no tengas conexión a Internet, o que se haya publicado una versión nueva del sitio.'
          : 'Ocurrió un error inesperado al cargar esta página.'}
      </p>
      <div className="flex gap-4 text-sky-700">
        <Link to="/">Ir al inicio</Link>
        <button type="button" onClick={() => window.location.reload()} className="underline">
          Recargar
        </button>
      </div>
    </div>
  )
}
