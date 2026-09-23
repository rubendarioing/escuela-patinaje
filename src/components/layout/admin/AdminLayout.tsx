import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/admin/AdminSidebar'
import { AdminHeader } from '@/components/layout/admin/AdminHeader'
import { AdminContent } from '@/components/layout/admin/AdminContent'
import { LoadingState } from '@/components/common/LoadingState'

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className={`${isSidebarOpen ? 'block' : 'hidden'} w-full border-b bg-white md:block md:w-56 md:border-b-0 md:border-r`}
      >
        <div className="border-b p-4">
          <span className="font-bold text-sky-700">Prados Skate</span>
          <p className="text-xs text-slate-500">Panel administrativo</p>
        </div>
        <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col">
        <AdminHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
        <AdminContent>
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </AdminContent>
      </div>
    </div>
  )
}
