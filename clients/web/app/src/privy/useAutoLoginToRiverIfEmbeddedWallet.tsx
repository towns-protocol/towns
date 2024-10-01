import React, { useCallback } from 'react'
import { useConnectivity, useFetchHasJoinPermission, useTownsClient } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import useStateMachine from '@cassiozen/usestatemachine'
import { Signer } from 'ethers'
import { usePrivy } from '@privy-io/react-auth'
import { clearEmbeddedWalletStorage } from '@towns/privy/EmbeddedSignerContext'
import {
    publicPageLoginStore,
    usePublicPageLoginFlow,
} from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { trackError } from 'hooks/useAnalytics'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { mapToErrorMessage } from '@components/Web3/utils'
type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>

// useStateMachine has issues w typescript 5.4
// https://github.com/cassiozen/useStateMachine/issues/94
type Context = {
    isAutoLoggingInToRiver: boolean
    hasSuccessfulLogin: boolean
}
type SetContextFn = (fn: (c: Context) => Context) => void

export function useAutoLoginToRiverIfEmbeddedWallet({
    riverLogin,
    riverAuthError,
    isRiverAuthencticated,
}: {
    riverLogin: UseConnectivtyReturnValue['login']
    riverAuthError: UseConnectivtyReturnValue['authError']
    isRiverAuthencticated: UseConnectivtyReturnValue['isAuthenticated']
}) {
    const { getSigner } = useGetEmbeddedSigner()
    const { logout: privyLogout } = usePrivy()
    const {
        end: endPublicPageLoginFlow,
        startJoinMeetsRequirements,
        startJoinDoesNotMeetRequirements,
    } = usePublicPageLoginFlow()
    const { clientSingleton } = useTownsClient()
    const fetchHasJoinPermission = useFetchHasJoinPermission()

    const userOps = clientSingleton?.userOps

    const _setupUserops = useCallback(
        async (signer: Signer) => {
            if (userOps) {
                userOps.setup(signer)
            }
        },
        [userOps],
    )

    const [state, send] = useStateMachine({
        context: { isAutoLoggingInToRiver: false, hasSuccessfulLogin: false },
        initial: isRiverAuthencticated ? 'loggedInBoth' : 'loggedOutBoth',
        states: {
            loggedOutBoth: {
                on: {
                    LOG_IN_TO_RIVER: {
                        target: 'loggingInToRiver',
                        guard({ context }: { context: Context }) {
                            if (context.isAutoLoggingInToRiver || context.hasSuccessfulLogin) {
                                return false
                            }
                            return true
                        },
                    },
                },
                effect({ setContext }: { setContext: SetContextFn }) {
                    setContext(() => ({
                        isAutoLoggingInToRiver: false,
                        hasSuccessfulLogin: false,
                    }))
                },
            },
            noSigner: {
                on: {
                    RESET: 'loggedOutBoth',
                },
                effect() {
                    async function _logout() {
                        clientSingleton?.userOps?.reset()
                        clearEmbeddedWalletStorage()
                        await privyLogout()
                        send('RESET')
                    }
                    _logout()
                },
            },
            loggingInToRiver: {
                on: {
                    LOGGED_IN_TO_RIVER: 'loggedInBoth',
                    NO_SIGNER: 'noSigner',
                },
                effect({ setContext }: { setContext: SetContextFn }) {
                    async function _login() {
                        // just in case
                        if (isRiverAuthencticated) {
                            console.warn('Aborting auto login to river, already logged in')
                            return
                        }

                        setContext((c: Context) => ({ ...c, isAutoLoggingInToRiver: true }))

                        let signer: Signer | undefined
                        let privyError: unknown | undefined = undefined

                        try {
                            signer = await getSigner()
                        } catch (error) {
                            privyError = error
                        }

                        if (!signer || privyError) {
                            send('NO_SIGNER')
                            alertPrivyError(privyError)
                            endPublicPageLoginFlow()
                            return
                        }

                        await riverLogin(signer, {
                            onSuccess: async ({ casablancaContext, wallet }) => {
                                send('LOGGED_IN_TO_RIVER')

                                if (signer) {
                                    await _setupUserops(signer)
                                    if (publicPageLoginStore.getState().spaceBeingJoined) {
                                        const isEntitled = await fetchHasJoinPermission({
                                            walletAddress: wallet,
                                            spaceId:
                                                publicPageLoginStore.getState().spaceBeingJoined,
                                        })

                                        if (isEntitled) {
                                            startJoinMeetsRequirements({
                                                signer,
                                                clientSingleton,
                                                signerContext: casablancaContext,
                                                source: 'auto login to river',
                                            })
                                        } else {
                                            startJoinDoesNotMeetRequirements()
                                        }
                                    }
                                }
                            },
                            onError: (error) => {
                                endPublicPageLoginFlow()
                                alertRiverError(error)
                                send('NO_SIGNER')
                            },
                        })
                    }
                    _login()
                    return () => {
                        setContext((c) => ({
                            ...c,
                            isAutoLoggingInToRiver: false,
                        }))
                    }
                },
            },
            loggedInBoth: {
                on: {
                    RESET: 'loggedOutBoth',
                },
                effect({ setContext }: { setContext: SetContextFn }) {
                    setContext((c) => ({ ...c, hasSuccessfulLogin: true }))
                    async function uo() {
                        let signer: Signer | undefined
                        try {
                            signer = await getSigner()
                        } catch (error) {
                            return
                        }
                        if (signer) {
                            await _setupUserops(signer)
                        }
                    }
                    void uo()
                },
            },
        },
    })

    const resetAutoLoginState = useCallback(() => {
        send('RESET')
    }, [send])

    const loginToRiverAfterPrivy = useCallback(() => {
        send('LOG_IN_TO_RIVER')
    }, [send])

    return {
        isAutoLoggingInToRiver: state.context.isAutoLoggingInToRiver,
        resetAutoLoginState,
        loginToRiverAfterPrivy,
    }
}

function alertPrivyError(pError: unknown | undefined) {
    const displayText =
        pError &&
        typeof pError === 'object' &&
        'message' in pError &&
        typeof pError.message === 'string'
            ? pError.message
            : `There was an error logging in, we couldn't detect your embedded wallet.`

    trackError({
        error: pError ?? new Error('privy_no_signer'),
        name: '',
        code: '',
        displayText: displayText,
        category: 'privy',
        source: 'auto login to river',
    })
    popupToast(({ toast }) => <StandardToast.Error toast={toast} message={displayText} />)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function alertRiverError(e: any) {
    const errorMessage = mapToErrorMessage(e) ?? 'An error occurred logging in to River.'
    popupToast(({ toast }) => <StandardToast.Error toast={toast} message={errorMessage} />)
}
