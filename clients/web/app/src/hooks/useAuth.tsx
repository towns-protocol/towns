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
import { useEmbeddedWallet } from '@towns/privy'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'
import { useAnalytics } from './useAnalytics'

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
        riverIsAuthenticated,
        riverLogin,
        riverLoginError: loginError,
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
    riverIsAuthenticated,
    riverLogin,
    loggedInWalletAddress,
    riverLoginError,
}: {
    riverIsAuthenticated: UseConnectivtyReturnValue['isAuthenticated']
    riverLogin: UseConnectivtyReturnValue['login']
    loggedInWalletAddress: AuthContext['loggedInWalletAddress']
    riverLoginError: AuthContext['loginError']
}) {
    const { track, setUserId, getUserId } = useAnalytics()
    const [isLoggingInPostPrivySuccess, setisLoggingInPostPrivySuccess] = useState(false) // flag to watch for when privy login callback is called and start logging in to river
    const isLoggingInGuard = useRef(false) // flag to prevent multiple logins to river
    const { signer } = useWeb3Context()
    const embeddedWallet = useEmbeddedWallet()

    const { login: privyLogin } = useLogin({
        // don't get confused, this cb only fires after you call privyLogin(), not on page load!
        // it fires a single time for every call to privyLogin()
        onComplete: (user, isNewUser, wasAlreadyAuthenticated) => {
            // if river is not logged in, then we need to login to river
            // we can't wait for signer and login w/in this callback b/c the references aren't updated and are stale by the time the callback fires
            // therefore, we need to set a flag that we can watch
            // if river is (somehow) already logged in, we don't need to do anything
            if (!riverIsAuthenticated) {
                isLoggingInGuard.current = false
                setisLoggingInPostPrivySuccess(true)
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

    useEffect(() => {
        // don't do anything unless flag is set
        if (!isLoggingInPostPrivySuccess) {
            return
        }

        if (riverLoginError) {
            console.error('Error logging in to river', riverLoginError)
            // there were errors, stop running the effect
            // in this case, user is in a state where they are logged in to privy, but not river. clicking "login" again will try to login to river, not use privyLogin or this effect
            // but if they somehow log out of privy in this state, we want to reset these flags, and clicking "login" will run this all over again
            isLoggingInGuard.current = false
            setisLoggingInPostPrivySuccess(false)
            return
        }

        async function loginOnceSignerIsSet() {
            if (!signer || isLoggingInGuard.current) {
                return
            }

            const signerAddress = await signer.getAddress()
            const embeddedWalletAddress = embeddedWallet?.address
            // signer can already exist if user has a wallet extension connected to the site (it's picked up in useWeb3Context)
            // so we should make sure it's the privy signer
            if (embeddedWalletAddress?.toLowerCase() !== signerAddress.toLowerCase()) {
                return
            }
            console.log(`usePostPrivyLogin: logging in`, {
                signerAddress,
                embeddedWalletAddress,
            })
            isLoggingInGuard.current = true
            // try to login to river as usual
            // login errors for river are already caputured in LoginComponent
            await riverLogin()
            // we logged in, stop running the effect
            // we want to reset these flags in case the user logs out of their session, then clicks "login" again, kicking off this effect
            setisLoggingInPostPrivySuccess(false)
            isLoggingInGuard.current = false
        }

        loginOnceSignerIsSet()
    }, [embeddedWallet?.address, isLoggingInPostPrivySuccess, riverLogin, signer, riverLoginError])

    return { privyLogin, isLoggingInPostPrivySuccess, setisLoggingInPostPrivySuccess }
}
