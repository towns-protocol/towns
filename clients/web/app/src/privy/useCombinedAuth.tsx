import { Address, useConnectivity, useMyDefaultUsernames } from 'use-towns-client'
import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { useLogin, usePrivy } from '@privy-io/react-auth'
import { retryGetAccessToken, useEmbeddedWallet, useGetSignerWithTimeout } from '@towns/privy'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useUnsubscribeNotification } from 'hooks/usePushSubscription'
import { Analytics } from 'hooks/useAnalytics'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useAutoLoginToRiverIfEmbeddedWallet } from './useAutoLoginToRiverIfEmbeddedWallet'

type CombinedAuthContext = {
    /**
     * true after the callback from logging in to privy is called, while the signer is being set and the user is logging in to river
     */
    isAutoLoggingInToRiver: boolean
    /**
     * login to privy if not connected, otherwise login to river
     */
    login: () => Promise<void>
    /**
     * logout of both privy and river
     */
    logout: () => Promise<void>
    /**
     * login to privy
     */
    privyLogin: () => void
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
    const embeddedWallet = useEmbeddedWallet()
    const defaultUsername: string | undefined = useMyDefaultUsernames()[0]
    const unsubscribeNotification = useUnsubscribeNotification()

    const { isAutoLoggingInToRiver, loginToRiverAfterPrivy, resetAutoLoginState } =
        useAutoLoginToRiverIfEmbeddedWallet({
            riverLogin,
            riverAuthError: authError,
            isRiverAuthencticated: riverIsAuthenticated,
            defaultUsername,
        })

    const { privyLogin } = usePrivyLoginWithErrorHandler({
        loggedInWalletAddress,
        loginToRiverAfterPrivy,
    })

    const { baseChain } = useEnvironment()
    const getSigner = useGetSignerWithTimeout({ chainId: baseChain.id })

    const login = useCallback(async () => {
        if (embeddedWallet) {
            const signer = await getSigner()
            await riverLogin(signer)
        } else {
            // login to privy, kicking off useAutoLoginToRiverIfEmbeddedWallet
            privyLogin()
        }
    }, [embeddedWallet, getSigner, riverLogin, privyLogin])

    const logout = useCallback(async () => {
        try {
            await riverLogout()
        } catch (error) {
            console.error('Error logging out of river', error)
            return
        }
        await privyLogout()
        resetAutoLoginState()
        await unsubscribeNotification()
    }, [privyLogout, resetAutoLoginState, unsubscribeNotification, riverLogout])

    return useMemo(
        () => ({
            login,
            logout,
            isAutoLoggingInToRiver,
            privyLogin,
        }),
        [login, logout, isAutoLoggingInToRiver, privyLogin],
    )
}

function usePrivyLoginWithErrorHandler({
    loggedInWalletAddress,
    loginToRiverAfterPrivy,
}: {
    loggedInWalletAddress: Address | undefined
    loginToRiverAfterPrivy?: () => void
}) {
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { logout: privyLogout } = usePrivy()

    const { login: privyLogin } = useLogin({
        async onComplete(user, isNewUser, wasAlreadyAuthenticated, loginMethod, loginAccount) {
            // don't call on page load when user already authenticated
            // BUG in privy: this hook is ALSO called when calling privy.useConnectWallet - and who knows when else
            // so we need to check if the user is already authenticated to river too (loggedInWalletAddress)
            if (!wasAlreadyAuthenticated && !loggedInWalletAddress) {
                loginToRiverAfterPrivy?.()
                console.log('[analytics] identify logged in user', {
                    loginMethod,
                })
                Analytics.getInstance().identify(
                    {
                        loginMethod,
                    },
                    () => {
                        console.log('[analytics] identify logged in user', {
                            loginMethod,
                        })
                    },
                )
                const tracked = {
                    isNewUser,
                    loginMethod,
                }
                Analytics.getInstance().track('login success', tracked, () => {
                    console.log('[analytics] login success', tracked)
                })
            }
            // loginAccount is only present when onComplete is called by actual login component
            // if other components have mounted useCombinedAuth, onComplete still fires, but loginAccount is undefined
            else if (!wasAlreadyAuthenticated && loggedInWalletAddress && loginAccount) {
                const privyWallet = user.wallet
                if (
                    !privyWallet ||
                    privyWallet.address.toLowerCase() !== loggedInWalletAddress.toLowerCase()
                ) {
                    try {
                        await privyLogout()
                        // extra safe
                        await retryGetAccessToken(1)
                    } catch (error) {
                        console.error('error logging out of privy', error)
                    }
                    popupToast(
                        ({ toast }) => (
                            <StandardToast.Error
                                toast={toast}
                                message="You're logged in to Towns with a different account. Please try again with the correct account."
                            />
                        ),
                        { dismissAll: true },
                    )
                } else if (
                    privyWallet &&
                    privyWallet.address.toLowerCase() === loggedInWalletAddress.toLowerCase()
                ) {
                    popupToast(
                        ({ toast }) => (
                            <StandardToast.Success
                                toast={toast}
                                message="You've been re-authenticated and can continue."
                            />
                        ),
                        { dismissAll: true },
                    )
                }
            }
        },
        onError: (error) => {
            endPublicPageLoginFlow()
            const tracked = {
                error,
            }
            Analytics.getInstance().track('login error', tracked, () => {
                console.log('[analytics] login error', tracked)
            })
            if (error === 'exited_auth_flow') {
                return
            }
        },
    })

    return { privyLogin }
}
