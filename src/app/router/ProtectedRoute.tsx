import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { LoadingState } from '@/components/common/LoadingState'

export function ProtectedRoute() {
  const { session, adminProfile, isLoading, signOut } = useAuth()
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    if (!isLoading && session && !adminProfile && !unauthorized) {
      setUnauthorized(true)
      signOut()
    }
  }, [isLoading, session, adminProfile, unauthorized, signOut])

  if (unauthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Acceso no autorizado</h1>
        <p className="text-sm text-slate-600">
          Tu cuenta no tiene permisos de administración en esta escuela.
        </p>
        <a href="/admin/login" className="text-sm text-sky-700 underline">
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingState label="Verificando sesión…" />
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
