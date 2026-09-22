import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AdminProfile } from '@/app/providers/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadProfile = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (!cancelled) {
          setAdminProfile(null)
          setIsLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('admin_profiles')
        .select('id, full_name, role, is_active')
        .eq('id', currentSession.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error || !data || !data.is_active) {
        setAdminProfile(null)
      } else {
        setAdminProfile({
          id: data.id,
          fullName: data.full_name,
          role: data.role as 'admin' | 'manager',
          isActive: data.is_active,
        })
      }
      setIsLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      loadProfile(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return
      setSession(newSession)
      setIsLoading(true)
      loadProfile(newSession)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setAdminProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, adminProfile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
