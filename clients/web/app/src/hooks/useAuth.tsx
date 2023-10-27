import { useConnectivity, useWeb3Context } from 'use-zion-client'
import React, { createContext, useCallback, useContext, useMemo } from 'react'

import { keccak256 } from 'ethers/lib/utils.js'
import { useLogin, usePrivy, useWallets } from '@privy-io/react-auth'
import { waitFor } from 'utils'
import { useAnalytics } from './useAnalytics'

export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>
export type LoginError = UseConnectivtyReturnValue['loginError']

export type AuthContext = Omit<UseConnectivtyReturnValue, 'login' | 'logout' | 'loginStatus'> & {
    // is the user logged in to privy
    // TODO: maybe delete
    isConnected: boolean
    privyReady: boolean
    // is the user logged in to privy and river
    isAuthenticatedAndConnected: boolean
    // login to privy or river depending on privy state
    login: () => Promise<void>
    // logout of both privy and river
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContext | undefined>(undefined)

export function AuthContextProvider({ children }: { children: JSX.Element }) {
    const auth = useAuthContext()
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used in a AuthContextProvider')
    }
    return context
}

function useAuthContext(): AuthContext {
    const {
        login: libLogin,
        logout: libLogout,
        register,
        activeWalletAddress,
        loggedInWalletAddress,
        isAuthenticated: libIsAuthenticated,
        loginError,
        userOnWrongNetworkForSignIn,
        getIsWalletRegistered,
    } = useConnectivity()
    const { signer } = useWeb3Context()

    const { ready: privyReady, authenticated: privyAuthenticated, logout: privyLogout } = usePrivy()
    const { wallets: privyWallets } = useWallets()
    const { track, setUserId, getUserId } = useAnalytics()

    const { login: privyLogin } = useLogin({
        onComplete: async (user, isNewUser, wasAlreadyAuthenticated) => {
            if (!libIsAuthenticated) {
                // this callback can happen quickly, wait for the signer to be set before trying to login
                try {
                    await waitFor(() => Promise.resolve(signer !== undefined), 2_000)
                    await libLogin()
                } catch (error) {
                    return
                }
            }
        },
        onError: (error) => {
            const userId = getUserId()
            if (userId == undefined) {
                setUserId(keccak256(loggedInWalletAddress as string).substring(0, 34))
            }
            track('wallet_connect_error', {
                error,
            })
        },
    })

    const isConnected = useMemo(() => {
        return privyReady && privyAuthenticated && !!privyWallets?.length
    }, [privyReady, privyWallets, privyAuthenticated])

    const isAuthenticatedAndConnected = useMemo(() => {
        return isConnected && libIsAuthenticated
    }, [isConnected, libIsAuthenticated])

    const login = useCallback(async () => {
        if (privyAuthenticated) {
            await libLogin()
        } else {
            // login to privy, after which the useLogin.onComplete will be called to log in user river backend
            privyLogin()
        }
    }, [libLogin, privyAuthenticated, privyLogin])

    const logout = useCallback(async () => {
        try {
            await libLogout()
        } catch (error) {
            return
        }
        await privyLogout()
    }, [libLogout, privyLogout])

    return useMemo(
        () => ({
            login,
            logout,
            getIsWalletRegistered,
            register,
            activeWalletAddress,
            loggedInWalletAddress,
            isAuthenticated: libIsAuthenticated,
            isAuthenticatedAndConnected, // csb + wallet
            isConnected, // isConnected means privy account is created and logged in
            loginError,
            userOnWrongNetworkForSignIn, // TODO: remove this
            privyReady,
        }),
        [
            activeWalletAddress,
            getIsWalletRegistered,
            isAuthenticatedAndConnected,
            isConnected,
            libIsAuthenticated,
            loggedInWalletAddress,
            login,
            loginError,
            logout,
            privyReady,
            register,
            userOnWrongNetworkForSignIn,
        ],
    )
}
