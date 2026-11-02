import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { unwrap } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthState {
  /** undefined while the stored session is being restored. */
  session: Session | null | undefined
  userId: string | null
  profile: Profile | null
  /** True after a password-recovery link was opened in this tab. */
  isRecovery: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isRecovery, setIsRecovery] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') {
        setIsRecovery(false)
        queryClient.clear()
      }
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id ?? null

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').eq('id', userId!).single()),
  })

  return (
    <AuthContext.Provider value={{ session, userId, profile: profileQuery.data ?? null, isRecovery }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** For components rendered behind RequireAuth. */
export function useUserId(): string {
  const { userId } = useAuth()
  if (!userId) throw new Error('useUserId called without a session')
  return userId
}
