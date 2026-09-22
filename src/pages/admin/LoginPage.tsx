import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { supabase } from '@/lib/supabase'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isLoading && session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/admin'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setIsSubmitting(false)
    if (signInError) {
      setError('Correo o contraseña incorrectos.')
    }
    // Si el login es correcto, AuthProvider detecta la sesión y este
    // componente redirige solo, arriba, cuando el perfil quede listo.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Panel administrativo</h1>
        <p className="mt-1 text-sm text-slate-500">Inicia sesión para continuar.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(buttonVariants({ variant: 'default' }), 'w-full disabled:opacity-50')}
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
