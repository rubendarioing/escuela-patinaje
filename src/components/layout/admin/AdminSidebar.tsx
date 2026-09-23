import { NavLink } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'

const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/sedes', label: 'Sedes' },
  { to: '/admin/programas', label: 'Programas' },
  { to: '/admin/instructores', label: 'Instructores' },
  { to: '/admin/horarios', label: 'Horarios' },
  { to: '/admin/deportistas', label: 'Deportistas' },
  { to: '/admin/acudientes', label: 'Acudientes' },
  { to: '/admin/inscripciones', label: 'Inscripciones' },
]

type AdminSidebarProps = {
  onNavigate?: () => void
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { adminProfile, signOut } = useAuth()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/admin'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
      <div className="my-2 border-t" />
      <p className="px-3 text-xs text-slate-600">
        {adminProfile?.fullName} · {adminProfile?.role}
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Salir
      </button>
    </nav>
  )
}
