import { create } from 'zustand'

import { AuthenticationError, AuthStatus } from '../hooks/login'

export type CasablancaStoreStates = {
    authStatus: AuthStatus
    setAuthStatus: (authStatus: AuthStatus) => void
    authError: AuthenticationError | null
    setAuthError: (error: AuthenticationError | undefined) => void
}

export const useCasablancaStore = create<CasablancaStoreStates>((set) => ({
    authStatus: AuthStatus.None,
    setAuthStatus: (authStatus) => set({ authStatus }),
    authError: null,
    setAuthError: (error) => {
        set({ authError: error ?? null })
    },
}))
