import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/horarios', label: 'Horarios' },
  { to: '/inscripcion', label: 'Inscríbete' },
]

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-lg font-bold text-sky-700">Escuela de Patinaje</span>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-sky-700' : 'text-slate-600 hover:text-sky-700'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t bg-slate-50 py-4 text-center text-xs text-slate-500">
        Escuela de Patinaje · Layout provisional
      </footer>
    </div>
  )
}
