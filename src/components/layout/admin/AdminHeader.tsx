import { Menu, X } from 'lucide-react'
import { AdminBreadcrumbs } from '@/components/layout/admin/AdminBreadcrumbs'

type AdminHeaderProps = {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export function AdminHeader({ isSidebarOpen, onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-3">
      <AdminBreadcrumbs />
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
    </header>
  )
}
