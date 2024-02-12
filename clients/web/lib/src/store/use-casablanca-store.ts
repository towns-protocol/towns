import { create } from 'zustand'

import { AuthenticationError, LoginStatus } from '../hooks/login'

export type CasablancaStoreStates = {
    loginStatus: LoginStatus
    setLoginStatus: (loginStatus: LoginStatus) => void
    loginError: AuthenticationError | null
    setLoginError: (error: AuthenticationError | undefined) => void
}

export const useCasablancaStore = create<CasablancaStoreStates>((set) => ({
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) => set({ loginStatus }),
    loginError: null,
    setLoginError: (error: AuthenticationError | undefined) => {
        set({ loginError: error ?? null })
    },
}))
