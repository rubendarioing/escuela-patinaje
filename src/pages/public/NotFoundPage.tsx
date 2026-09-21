import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="py-10 text-center">
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-600">La página que buscas no existe.</p>
      <div className="mt-4 flex justify-center gap-4 text-sky-700">
        <Link to="/">Ir al inicio</Link>
        <Link to="/horarios">Ver horarios</Link>
      </div>
    </section>
  )
}
