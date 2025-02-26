import { Address, useConnectivity, useMyDefaultUsernames } from 'use-towns-client'
import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { Wallet, useCreateWallet, useLogin, usePrivy } from '@privy-io/react-auth'
import { retryGetAccessToken, useEmbeddedWallet, useGetSignerWithTimeout } from '@towns/privy'
import {
    getPrivyLoginMethodFromLocalStorage,
    setPrivyLoginMethodToLocalStorage,
} from '@towns/userops'
import { LinkedAccountType } from '@gateway-worker/types'
import { Toast } from 'react-hot-toast/headless'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useUnsubscribeNotification } from 'hooks/usePushSubscription'
import { Analytics } from 'hooks/useAnalytics'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { usePrepareRedirect } from 'hooks/usePrepareRedirect'
import { getLinkedAccounts } from 'api/lib/linkedAccounts'
import { Box, Button } from '@ui'
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
    const { embeddedWallet, privyAuthenticated, privyReady, walletsReady } = useEmbeddedWallet()
    const { createWallet } = useCreateWallet()

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
            // suspect privy behavior where embedded wallet is not auto created for user
            // so if they're authenticated but don't have one then try and create one
            if (privyReady && privyAuthenticated && walletsReady) {
                // login to privy, kicking off useAutoLoginToRiverIfEmbeddedWallet
                let wallet: Wallet | undefined
                try {
                    console.log('[useCombinedAuth] creating embedded wallet...')
                    wallet = await createWallet()
                } catch (error) {
                    console.error('[useCombinedAuth] error creating embedded wallet', error)
                }
                if (wallet) {
                    console.log('[useCombinedAuth] embedded wallet created, logging in to river...')
                    const signer = await getSigner()
                    await riverLogin(signer)
                }
            } else {
                privyLogin()
            }
        }
    }, [
        embeddedWallet,
        getSigner,
        riverLogin,
        privyReady,
        privyAuthenticated,
        walletsReady,
        createWallet,
        privyLogin,
    ])

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
    const { prepareRedirect } = usePrepareRedirect()

    const { login: privyLogin } = useLogin({
        async onComplete({ user, isNewUser, wasAlreadyAuthenticated, loginMethod, loginAccount }) {
            // onComplete always fires - if already logged in and loading page, or if logging in
            // loginMethod will only be present if actually logging in
            savePrivyLoginMethodToLocalStorage(loginMethod)

            // don't call on page load when user already authenticated
            // BUG in privy: this hook is ALSO called when calling privy.useConnectWallet - and who knows when else
            // so we need to check if the user is already authenticated to river too (loggedInWalletAddress)
            if (!wasAlreadyAuthenticated && !loggedInWalletAddress) {
                Analytics.getInstance().identify({
                    loginMethod,
                })
                const tracked = {
                    isNewUser,
                    loginMethod,
                }
                Analytics.getInstance().track('privy login success', tracked)
                loginToRiverAfterPrivy?.()
            }
            // loginAccount is only present when onComplete is called by actual login component
            // if other components have mounted useCombinedAuth, onComplete still fires, but loginAccount is undefined
            else if (!wasAlreadyAuthenticated && loggedInWalletAddress && loginAccount) {
                const privyWallet = user.wallet
                if (
                    !privyWallet ||
                    privyWallet.address.toLowerCase() !== loggedInWalletAddress.toLowerCase()
                ) {
                    popupToast(
                        ({ toast }) => (
                            <StandardToast.Pending
                                toast={toast}
                                message="Checking your previous login method..."
                            />
                        ),
                        { dismissAll: true },
                    )
                    const acccessToken = await retryGetAccessToken(1)
                    const linkedPrivyAccounts = await getLinkedAccounts(
                        loggedInWalletAddress,
                        acccessToken,
                    )
                    try {
                        await privyLogout()
                        // extra safe
                        await retryGetAccessToken(1)
                    } catch (error) {
                        console.error('error logging out of privy', error)
                    }
                    popupToast(
                        ({ toast }) => (
                            <LoginMismatchToast
                                linkedPrivyAccounts={linkedPrivyAccounts}
                                toast={toast}
                            />
                        ),
                        { dismissAll: true, duration: Infinity },
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
            if (error === 'exited_auth_flow') {
                Analytics.getInstance().track('exited privy modal')
            } else {
                Analytics.getInstance().track('privy login error', {
                    error,
                })
            }
        },
    })

    // runs the prepareRedirect hook right before `privyLogin` is called,
    // see usePrepareRedirect.ts for more info
    const loginWithoutRedirect = useCallback(() => {
        prepareRedirect()
        privyLogin()
    }, [privyLogin, prepareRedirect])

    return { privyLogin: loginWithoutRedirect }
}

function savePrivyLoginMethodToLocalStorage(loginMethod: string | null) {
    if (loginMethod) {
        setPrivyLoginMethodToLocalStorage(loginMethod)
        return
    }
    const pLoginMethod = getPrivyLoginMethodFromLocalStorage()

    // for clients that are already logged in, this will set it to the last login method by parsing privy's local storage key
    if (pLoginMethod) {
        setPrivyLoginMethodToLocalStorage(pLoginMethod)
    }
}

function LoginMismatchToast({
    linkedPrivyAccounts,
    toast,
}: {
    linkedPrivyAccounts: LinkedAccountType[]
    toast: Toast
}) {
    const { privyLogin } = useCombinedAuth()
    const { logout: riverLogout } = useConnectivity()

    return (
        <StandardToast.Error
            toast={toast}
            message={
                <Box gap>
                    {linkedPrivyAccounts.length ? (
                        <>
                            Previously, you signed in to Towns with one of these accounts:
                            <Box background="level3" padding="sm" rounded="sm" gap="sm">
                                {linkedPrivyAccounts.map((account) => (
                                    <Box key={account.identifier}>
                                        {account.type.replace('_oauth', '')}: {account.identifier}
                                    </Box>
                                ))}
                            </Box>
                            Please try again with one of these accounts. Alternatively, you can
                            logout and sign in with a different account.
                        </>
                    ) : (
                        <>
                            You signed in to Towns with a different account. Please try again with
                            that account, or logout and sign in with a different account.
                        </>
                    )}

                    <Box gap horizontal>
                        <Button
                            grow
                            flexBasis="none"
                            size="button_sm"
                            onClick={() => {
                                dismissToast(toast.id)
                                setTimeout(() => {
                                    riverLogout()
                                }, 100)
                            }}
                        >
                            Logout
                        </Button>
                        <Button
                            grow
                            tone="positive"
                            flexBasis="none"
                            size="button_sm"
                            onClick={() => {
                                dismissToast(toast.id)
                                privyLogin()
                            }}
                        >
                            Try again
                        </Button>
                    </Box>
                </Box>
            }
        />
    )
}
