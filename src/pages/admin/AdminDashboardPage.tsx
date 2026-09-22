import { useAuth } from '@/app/providers/useAuth'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AdminDashboardPage() {
  const { adminProfile, signOut } = useAuth()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">Panel administrativo</h1>
      <p className="mt-2 text-slate-600">
        Hola, {adminProfile?.fullName} ({adminProfile?.role}).
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
