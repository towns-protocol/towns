import { useConnectivity } from 'use-zion-client'
import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { toast } from 'react-hot-toast/headless'
import { useLogin, usePrivy } from '@privy-io/react-auth'
import { useEmbeddedWallet, useGetEmbeddedSigner } from '@towns/privy'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'
import { useAutoLoginToRiverIfEmbeddedWallet } from './useAutoLoginToRiverIfEmbeddedWallet'

export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>
export type LoginError = UseConnectivtyReturnValue['loginError']

export type AuthContext = Omit<UseConnectivtyReturnValue, 'login' | 'logout' | 'loginStatus'> & {
    /**
     * true after the callback from logging in to privy is called, while the signer is being set and the user is logging in to river
     */
    isAutoLoggingInToRiver: boolean
    /**
     * the user is logged in to privy and has an embedded wallet
     */
    isConnected: boolean
    /**
     * the user is logged in to privy and has an embedded wallet
     * and is logged into river
     */
    isAuthenticatedAndConnected: boolean
    /**
     * login to privy if not connected, otherwise login to river
     */
    login: () => Promise<void>
    /**
     * logout of both privy and river
     */
    logout: () => Promise<void>
    /**
     * login status for river
     */
    riverLoginStatus: UseConnectivtyReturnValue['loginStatus']
}

const AuthContext = createContext<AuthContext | undefined>(undefined)

export function AuthContextProvider({
    children,
}: {
    children: React.ReactNode | React.ReactNode[]
}) {
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
        login: riverLogin,
        logout: riverLogout,
        register,
        loggedInWalletAddress,
        isAuthenticated: riverIsAuthenticated,
        loginError,
        userOnWrongNetworkForSignIn,
        loginStatus: riverLoginStatus,
        getIsWalletRegistered,
    } = useConnectivity()
    const { logout: privyLogout } = usePrivy()
    const { privyLogin } = usePrivyLoginWithErrorHandler({
        loggedInWalletAddress,
    })

    const { isAutoLoggingInToRiver } = useAutoLoginToRiverIfEmbeddedWallet({
        riverIsAuthenticated,
        riverLogin,
        riverLoginError: loginError,
    })

    const getSigner = useGetEmbeddedSigner()
    const isConnected = useIsConnected()
    const isAuthenticatedAndConnected = isConnected && riverIsAuthenticated

    const login = useCallback(async () => {
        if (isConnected) {
            const signer = await getSigner()
            await riverLogin(signer)
        } else {
            // login to privy, kicking off useAutoLoginToRiverIfEmbeddedWallet
            privyLogin()
        }
    }, [isConnected, riverLogin, getSigner, privyLogin])

    const logout = useCallback(async () => {
        try {
            await riverLogout()
        } catch (error) {
            console.error('Error logging out of river', error)
            return
        }
        await privyLogout()
    }, [riverLogout, privyLogout])

    return useMemo(
        () => ({
            login,
            logout,
            getIsWalletRegistered,
            register,
            riverLoginStatus,
            loggedInWalletAddress,
            isAuthenticated: riverIsAuthenticated,
            isAuthenticatedAndConnected, // csb + wallet
            isConnected, // isConnected means privy account is created and logged in
            loginError,
            userOnWrongNetworkForSignIn, // TODO: remove this
            isAutoLoggingInToRiver,
        }),
        [
            getIsWalletRegistered,
            isAuthenticatedAndConnected,
            isConnected,
            riverLoginStatus,
            riverIsAuthenticated,
            loggedInWalletAddress,
            login,
            loginError,
            logout,
            register,
            userOnWrongNetworkForSignIn,
            isAutoLoggingInToRiver,
        ],
    )
}

/**
 * the user is logged in to privy and has an embedded wallet
 * This hook can be used outside of auth context provider
 */
export function useIsConnected(): AuthContext['isConnected'] {
    const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy()
    const embeddedWallet = useEmbeddedWallet()
    return privyReady && privyAuthenticated && !!embeddedWallet
}

function usePrivyLoginWithErrorHandler({
    loggedInWalletAddress,
}: {
    loggedInWalletAddress: AuthContext['loggedInWalletAddress']
}) {
    const { login: privyLogin } = useLogin({
        onError: (error) => {
            toast.custom(
                (t) => {
                    return (
                        <ErrorNotification
                            toast={t}
                            errorMessage="There was an error logging in to Privy."
                            contextMessage={error}
                        />
                    )
                },
                {
                    duration: Infinity,
                },
            )
        },
    })

    return { privyLogin }
}
