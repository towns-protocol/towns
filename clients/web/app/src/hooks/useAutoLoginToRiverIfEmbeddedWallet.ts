import { useCallback, useEffect } from 'react'
import { useConnectivity } from 'use-zion-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import useStateMachine, { t } from '@cassiozen/usestatemachine'
type UseConnectivtyReturnValue = ReturnType<typeof useConnectivity>

export function useAutoLoginToRiverIfEmbeddedWallet({
    riverLogin,
    riverLoginError,
}: {
    riverLogin: UseConnectivtyReturnValue['login']
    riverLoginError: UseConnectivtyReturnValue['loginError']
}) {
    const getSigner = useGetEmbeddedSigner()

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
            loggingInToRiver: {
                on: {
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
            send('RESET')
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
