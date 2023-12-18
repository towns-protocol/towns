import { useEffect } from 'react'
import { useConnectivity } from 'use-zion-client'
import { useEmbeddedWallet, useGetEmbeddedSigner } from '@towns/privy'
import useStateMachine, { t } from '@cassiozen/usestatemachine'
import { usePrivy } from '@privy-io/react-auth'
type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>

export function useAutoLoginToRiverIfEmbeddedWallet({
    riverIsAuthenticated,
    riverLogin,
    riverLoginError,
}: {
    riverIsAuthenticated: UseConnectivtyReturnValue['isAuthenticated']
    riverLogin: UseConnectivtyReturnValue['login']
    riverLoginError: UseConnectivtyReturnValue['loginError']
}) {
    const embeddedWallet = useEmbeddedWallet()
    const getSigner = useGetEmbeddedSigner()
    const { ready: privyReady } = usePrivy()

    const [state, send] = useStateMachine({
        schema: {
            events: {
                CYCLE: t<{ riverIsAuthenticated: boolean }>(),
            },
        },
        context: { isAutoLoggingInToRiver: false, hasSuccessfulLogin: false },
        initial: 'loggedOutBoth',
        states: {
            loggedOutBoth: {
                on: {
                    CYCLE: 'privyLoggedInButRiverUnknown',
                },
                effect({ setContext }) {
                    setContext((c) => ({
                        isAutoLoggingInToRiver: false,
                        hasSuccessfulLogin: false,
                    }))
                },
            },
            privyLoggedInButRiverUnknown: {
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
                    RESET: 'loggedOutBoth',
                    LOGGED_IN_BOTH: 'loggedInBoth',
                },
                effect({ event }) {
                    if (event.type === 'CYCLE') {
                        if (event.riverIsAuthenticated) {
                            // this is a page load, user is already logged in to river
                            send('LOGGED_IN_BOTH')
                            return
                        } else {
                            send('LOG_IN_TO_RIVER')
                        }
                    }
                },
            },
            loggingInToRiver: {
                on: {
                    CYCLE: 'loggedInBoth',
                    RESET: 'loggedOutBoth',
                },
                effect({ setContext }) {
                    async function _login() {
                        setContext((c) => ({ ...c, isAutoLoggingInToRiver: true }))
                        let signer
                        try {
                            signer = await getSigner()
                        } catch (error) {
                            send('RESET')
                            return
                        }
                        riverLogin(signer)
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
                    CYCLE: 'privyLoggedInButRiverUnknown',
                    RESET: 'loggedOutBoth',
                },
                effect({ setContext }) {
                    setContext((c) => ({ ...c, hasSuccessfulLogin: true }))
                },
            },
        },
    })

    useEffect(() => {
        if (!privyReady) {
            return
        }
        if (!embeddedWallet || riverLoginError) {
            send('RESET')
            return
        }
        send({ type: 'CYCLE', riverIsAuthenticated })
    }, [send, riverIsAuthenticated, embeddedWallet, riverLoginError, privyReady])

    return { isAutoLoggingInToRiver: state.context.isAutoLoggingInToRiver }
}
