import { Address, useConnectivity } from 'use-towns-client'
import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { toast } from 'react-hot-toast/headless'
import { useLogin, usePrivy } from '@privy-io/react-auth'
import { useEmbeddedWallet, useGetEmbeddedSigner } from '@towns/privy'
import { clearEmbeddedWalletStorage } from '@towns/privy/EmbeddedSignerContext'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useUnsubscribeNotification } from 'hooks/usePushSubscription'
import { useAnalytics } from 'hooks/useAnalytics'
import { useAutoLoginToRiverIfEmbeddedWallet } from './useAutoLoginToRiverIfEmbeddedWallet'

type CombinedAuthContext = {
    /**
     * true after the callback from logging in to privy is called, while the signer is being set and the user is logging in to river
     */
    isAutoLoggingInToRiver: boolean
    /**
     * the user is logged in to privy and has an embedded wallet
     */
    isConnected: boolean

    /**
     * login to privy if not connected, otherwise login to river
     */
    login: () => Promise<void>
    /**
     * logout of both privy and river
     */
    logout: () => Promise<void>
}

const CombinedAuthContext = createContext<CombinedAuthContext | undefined>(undefined)

export function CombinedAuthContextProvider({
    children,
}: {
    children: React.ReactNode | React.ReactNode[]
}) {
    const auth = useCombinedAuthContext()
    return <CombinedAuthContext.Provider value={auth}>{children}</CombinedAuthContext.Provider>
}

export function useCombinedAuth() {
    const context = useContext(CombinedAuthContext)
    if (!context) {
        throw new Error('useCombinedAuth must be used in a CombinedAuthContextProvider')
    }
    return context
}

function useCombinedAuthContext(): CombinedAuthContext {
    const {
        login: riverLogin,
        logout: riverLogout,
        loggedInWalletAddress,
        isAuthenticated: riverIsAuthenticated,
        authError,
    } = useConnectivity()
    const { logout: privyLogout } = usePrivy()
    const unsubscribeNotification = useUnsubscribeNotification()

    const { isAutoLoggingInToRiver, loginToRiverAfterPrivy, resetAutoLoginState } =
        useAutoLoginToRiverIfEmbeddedWallet({
            riverLogin,
            riverAuthError: authError,
            isRiverAuthencticated: riverIsAuthenticated,
        })

    const { privyLogin } = usePrivyLoginWithErrorHandler({
        loggedInWalletAddress,
        loginToRiverAfterPrivy,
    })

    const { getSigner } = useGetEmbeddedSigner()
    const isConnected = useIsConnected()

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
        clearEmbeddedWalletStorage()
        resetAutoLoginState()
        await unsubscribeNotification()
    }, [privyLogout, resetAutoLoginState, unsubscribeNotification, riverLogout])

    return useMemo(
        () => ({
            login,
            logout,
            isConnected, // isConnected means privy account is created and logged in
            isAutoLoggingInToRiver,
        }),
        [isConnected, login, logout, isAutoLoggingInToRiver],
    )
}

/**
 * the user is logged in to privy and has an embedded wallet
 */
function useIsConnected(): CombinedAuthContext['isConnected'] {
    const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy()
    const embeddedWallet = useEmbeddedWallet()
    return privyReady && privyAuthenticated && !!embeddedWallet
}

function usePrivyLoginWithErrorHandler({
    loggedInWalletAddress,
    loginToRiverAfterPrivy,
}: {
    loggedInWalletAddress: Address | undefined
    loginToRiverAfterPrivy?: () => void
}) {
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { analytics } = useAnalytics()
    const { login: privyLogin } = useLogin({
        onComplete(user, isNewUser, wasAlreadyAuthenticated, loginMethod) {
            // don't call on page load when user already authenticated
            // BUG in privy: this hook is ALSO called when calling privy.useConnectWallet - and who knows when else
            // so we need to check if the user is already authenticated to river too (loggedInWalletAddress)
            if (!wasAlreadyAuthenticated && !loggedInWalletAddress) {
                loginToRiverAfterPrivy?.()
                const pseudoId = user?.wallet?.address
                    ? analytics?.setPseudoId(user.wallet.address)
                    : undefined
                try {
                    const tracked = {
                        isNewUser,
                        loginMethod,
                        pseudoId,
                    }
                    analytics?.track('login success', tracked, () => {
                        console.log('[analytics] login success', tracked)
                    })
                } catch (error) {
                    console.error('[analytics] Error tracking login success', error)
                }
            }
        },
        onError: (error) => {
            endPublicPageLoginFlow()
            const tracked = {
                error,
            }
            analytics?.track('login error', tracked, () => {
                console.log('[analytics] login error', tracked)
            })
            if (error === 'exited_auth_flow') {
                return
            }
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
