import { useConnectivity, useWeb3Context } from 'use-zion-client'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { toast } from 'react-hot-toast/headless'

import { keccak256 } from 'ethers/lib/utils.js'
import { useLogin, usePrivy } from '@privy-io/react-auth'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'
import { useAnalytics } from './useAnalytics'
import { useEmbeddedWallet } from './useEmbeddedWallet'
import { useRetryUntilResolved } from './useRetryUntilResolved'
import { useErrorToast } from './useErrorToast'

export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>
export type LoginError = UseConnectivtyReturnValue['loginError']

export type AuthContext = Omit<UseConnectivtyReturnValue, 'login' | 'logout' | 'loginStatus'> & {
    // privy sdk is ready to use
    privyReady: boolean
    isSignerReady: boolean
    /**
     * true after the callback from logging in to privy is called, while the signer is being set and the user is logging in to river
     */
    isLoggingInPostPrivySuccess: boolean
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
        activeWalletAddress,
        loggedInWalletAddress,
        isAuthenticated: riverIsAuthenticated,
        loginError,
        userOnWrongNetworkForSignIn,
        loginStatus: riverLoginStatus,
        getIsWalletRegistered,
    } = useConnectivity()
    const { ready: privyReady, logout: privyLogout } = usePrivy()
    const { privyLogin, isLoggingInPostPrivySuccess } = usePrivyLogin({
        isAuthenticated: riverIsAuthenticated,
        login: riverLogin,
        loggedInWalletAddress,
    })

    const isSignerReady = !!useWeb3Context().signer
    const isConnected = useIsConnected()
    const isAuthenticatedAndConnected = isConnected && riverIsAuthenticated

    const login = useCallback(async () => {
        if (isConnected) {
            await riverLogin()
        } else {
            // login to privy, after which the useLogin.onComplete will be called to log in user river backend
            privyLogin()
        }
    }, [riverLogin, isConnected, privyLogin])

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
            activeWalletAddress,
            loggedInWalletAddress,
            isAuthenticated: riverIsAuthenticated,
            isAuthenticatedAndConnected, // csb + wallet
            isConnected, // isConnected means privy account is created and logged in
            loginError,
            userOnWrongNetworkForSignIn, // TODO: remove this
            privyReady,
            isSignerReady,
            isLoggingInPostPrivySuccess,
        }),
        [
            activeWalletAddress,
            getIsWalletRegistered,
            isAuthenticatedAndConnected,
            isConnected,
            riverLoginStatus,
            riverIsAuthenticated,
            loggedInWalletAddress,
            login,
            loginError,
            logout,
            privyReady,
            register,
            userOnWrongNetworkForSignIn,
            isSignerReady,
            isLoggingInPostPrivySuccess,
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

function usePrivyLogin({
    isAuthenticated: libIsAuthenticated,
    login: libLogin,
    loggedInWalletAddress,
}: Pick<AuthContext, 'isAuthenticated' | 'login' | 'loggedInWalletAddress'>) {
    const { track, setUserId, getUserId } = useAnalytics()
    const [hasLoggedInToPrivy, setHasLoggedInToPrivy] = useState(false)

    const isLoggingInPostPrivySuccess = usePostPrivyLogin({
        hasLoggedInToPrivy,
        libLogin,
    })

    const { login: privyLogin } = useLogin({
        // don't get confused, this cb only fires after you call privyLogin(), not on page load!
        onComplete: (user, isNewUser, wasAlreadyAuthenticated) => {
            // we can't wait for signer and login w/in this callback b/c
            // the references aren't updated and are stale by the time the callback fires
            // therefore, we need to set a flag that we can listen to in usePostPrivyLogin
            if (!libIsAuthenticated) {
                setHasLoggedInToPrivy(true)
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

    return { privyLogin, isLoggingInPostPrivySuccess }
}

// once the user has logged in to privy, we need to login to river
function usePostPrivyLogin({
    hasLoggedInToPrivy,
    libLogin,
}: {
    hasLoggedInToPrivy: boolean
    libLogin: () => Promise<void>
}) {
    const { signer } = useWeb3Context()
    const isLogginIng = useRef(false)
    const [isLoggingInPostPrivySuccess, setisLoggingInPostPrivySuccess] = useState(false)

    const hasResolved = useRetryUntilResolved(
        () => {
            setisLoggingInPostPrivySuccess(true)
            if (signer && !isLogginIng.current) {
                console.log(`usePostPrivyLogin: signer set`, signer)
                isLogginIng.current = true
                // try to login to river as usual
                // login errors for river are already caputured in LoginComponent
                libLogin().finally(() => setisLoggingInPostPrivySuccess(false))
                return true
            }
            return false
        },
        // if null, or the callback resolves, the retry stops
        !hasLoggedInToPrivy ? null : 100,
        5_000,
    )

    const errorMessage = hasResolved && !signer ? `Didn't attempt to login to River.` : undefined

    useErrorToast({
        errorMessage,
        contextMessage: 'Signer was never set.',
    })

    useEffect(() => {
        if (hasResolved && !signer) {
            console.log(`usePostPrivyLogin: signer was never set`)
            setisLoggingInPostPrivySuccess(false)
        }
    }, [hasResolved, signer])

    return isLoggingInPostPrivySuccess
}
