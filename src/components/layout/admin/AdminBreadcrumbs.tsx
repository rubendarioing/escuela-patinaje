import { useLocation } from 'react-router-dom'

const LABELS: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/sedes': 'Sedes',
  '/admin/programas': 'Programas',
  '/admin/instructores': 'Instructores',
  '/admin/horarios': 'Horarios',
  '/admin/deportistas': 'Deportistas',
  '/admin/acudientes': 'Acudientes',
  '/admin/inscripciones': 'Inscripciones',
}

export function AdminBreadcrumbs() {
  const location = useLocation()
  const label = LABELS[location.pathname] ?? 'Panel administrativo'

  return <p className="text-sm text-slate-500">{label}</p>
}
