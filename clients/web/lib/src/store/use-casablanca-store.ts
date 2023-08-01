import { create } from 'zustand'

import { AuthenticationError, LoginStatus } from '../hooks/login'
import { User } from '../types/zion-types'

export type CasablancaStoreStates = {
    loginStatus: LoginStatus
    setLoginStatus: (loginStatus: LoginStatus) => void
    loginError: AuthenticationError | null
    setLoginError: (error: AuthenticationError | undefined) => void
}

export const useCasablancaStore = create<CasablancaStoreStates>((set) => ({
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) =>
        loginStatus === LoginStatus.LoggedOut
            ? set({
                  loginStatus,
              })
            : loginStatus === LoginStatus.LoggingIn
            ? set({
                  loginError: null,
                  loginStatus,
              })
            : set({
                  loginStatus,
              }),
    loginError: null,
    setLoginError: (error: AuthenticationError | undefined) => set({ loginError: error ?? null }),
}))

export function toZionCasablancaUser(theUser: string | undefined): User {
    return {
        userId: theUser ?? '',
        displayName: theUser ?? '',
        avatarUrl: theUser,
        presence: 'NA',
        lastPresenceTs: 0,
        currentlyActive: true,
    }
}
