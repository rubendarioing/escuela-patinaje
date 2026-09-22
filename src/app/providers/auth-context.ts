import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AdminProfile = {
  id: string
  fullName: string
  role: 'admin' | 'manager'
  isActive: boolean
}

export type AuthContextValue = {
  session: Session | null
  adminProfile: AdminProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
