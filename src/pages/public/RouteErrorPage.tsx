import { Link, useRouteError } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  console.error('Error de ruta no controlado:', error)

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
      <p className="text-sm text-slate-600">Ocurrió un error inesperado al cargar esta página.</p>
      <div className="flex gap-4 text-sky-700">
        <Link to="/">Ir al inicio</Link>
        <button type="button" onClick={() => window.location.reload()} className="underline">
          Recargar
        </button>
      </div>
    </div>
  )
}
