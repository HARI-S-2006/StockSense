'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SessionPayload, Role } from '@/lib/auth'

interface SessionState {
  session: SessionPayload | null
  token: string | null
  isLoading: boolean
  setSession: (session: SessionPayload | null, token?: string) => void
  clearSession: () => void
  setLoading: (loading: boolean) => void
  hasRole: (roles: Role[]) => boolean
  isManager: () => boolean
  isStaff: () => boolean
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      token: null,
      isLoading: true,

      setSession: (session, token) => {
        set({ session, token: token ?? get().token, isLoading: false })
      },

      clearSession: () => {
        set({ session: null, token: null, isLoading: false })
      },

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      hasRole: (roles) => {
        const { session } = get()
        return session ? roles.includes(session.role) : false
      },

      isManager: () => {
        const { session } = get()
        return session?.role === 'INVENTORY_MANAGER'
      },

      isStaff: () => {
        const { session } = get()
        return session?.role === 'WAREHOUSE_STAFF'
      },
    }),
    {
      name: 'stocksense-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, token: state.token }),
    }
  )
)

// React hook for components
export function useSession() {
  const { session, token, isLoading, setSession, clearSession, setLoading, hasRole, isManager, isStaff } = useSessionStore()

  return {
    session,
    token,
    isLoading,
    setSession,
    clearSession,
    setLoading,
    hasRole,
    isManager,
    isStaff,
    user: session,
  }
}