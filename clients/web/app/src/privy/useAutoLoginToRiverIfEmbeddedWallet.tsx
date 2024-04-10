import React, { useCallback, useEffect } from 'react'
import { useConnectivity } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import useStateMachine from '@cassiozen/usestatemachine'
import { toast } from 'react-hot-toast/headless'
import { ethers } from 'ethers'
import { usePrivy } from '@privy-io/react-auth'
import { clearEmbeddedWalletStorage } from '@towns/privy/EmbeddedSignerContext'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'
import { waitFor } from 'utils'
type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>

export function useAutoLoginToRiverIfEmbeddedWallet({
    riverLogin,
    riverLoginError,
    isRiverAuthencticated,
}: {
    riverLogin: UseConnectivtyReturnValue['login']
    riverLoginError: UseConnectivtyReturnValue['loginError']
    isRiverAuthencticated: UseConnectivtyReturnValue['isAuthenticated']
}) {
    const getSigner = useGetEmbeddedSigner()
    const { logout: privyLogout } = usePrivy()

    const [state, send] = useStateMachine({
        context: { isAutoLoggingInToRiver: false, hasSuccessfulLogin: false },
        initial: isRiverAuthencticated ? 'loggedInBoth' : 'loggedOutBoth',
        states: {
            loggedOutBoth: {
                on: {
                    LOG_IN_TO_RIVER: {
                        target: 'loggingInToRiver',
                        guard({ context }) {
                            if (context.isAutoLoggingInToRiver || context.hasSuccessfulLogin) {
                                return false
                            }
                            return true
                        },
                    },
                },
                effect({ setContext }) {
                    setContext((c) => ({
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
                        await privyLogout()
                        clearEmbeddedWalletStorage()
                        send('RESET')
                        toast.custom((t) => (
                            <ErrorNotification
                                toast={t}
                                errorMessage="Can't detect signer."
                                contextMessage="There was an error logging in, please try again."
                            />
                        ))
                    }
                    _logout()
                },
            },
            loggingInToRiver: {
                on: {
                    LOGGED_IN_TO_RIVER: 'loggedInBoth',
                    NO_SIGNER: 'noSigner',
                },
                effect({ setContext }) {
                    async function _login() {
                        // just in case
                        if (isRiverAuthencticated) {
                            console.warn('Aborting auto login to river, already logged in')
                            return
                        }

                        setContext((c) => ({ ...c, isAutoLoggingInToRiver: true }))

                        let signer: ethers.Signer | undefined
                        try {
                            // same machine, same browser, different users
                            // i've found that for certain of my privy accounts, this takes much longer to be true???
                            signer = await waitFor(() => getSigner(), 10_000)
                        } catch (error) {
                            send('NO_SIGNER')
                            return
                        }
                        if (!signer) {
                            console.warn('useAutoLogin: No signer found')
                            send('NO_SIGNER')
                            return
                        }
                        await riverLogin(signer)
                        send('LOGGED_IN_TO_RIVER')
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
                effect({ setContext }) {
                    setContext((c) => ({ ...c, hasSuccessfulLogin: true }))
                },
            },
        },
    })

    useEffect(() => {
        if (riverLoginError) {
            send('NO_SIGNER')
        }
    }, [riverLoginError, send])

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
