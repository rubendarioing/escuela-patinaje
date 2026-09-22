import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { LoadingState } from '@/components/common/LoadingState'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ProtectedRoute() {
  const { session, adminProfile, isLoading, signOut } = useAuth()

  if (isLoading) {
    return <LoadingState label="Verificando sesión…" />
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  if (!adminProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Acceso no autorizado</h1>
        <p className="text-sm text-slate-600">
          Tu cuenta no tiene permisos de administración en esta escuela.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Cerrar sesión y volver al login
        </button>
      </div>
    )
  }

  return <Outlet />
}
