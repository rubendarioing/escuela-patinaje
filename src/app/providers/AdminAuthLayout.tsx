import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'

export function AdminAuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
