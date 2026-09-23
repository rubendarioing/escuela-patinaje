import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { LoadingState } from '@/components/common/LoadingState'

export function AdminAuthLayout() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  )
}
