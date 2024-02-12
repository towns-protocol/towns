import { useCallback, useEffect } from 'react'
import { useConnectivity } from 'use-zion-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import useStateMachine from '@cassiozen/usestatemachine'
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
            loggingInToRiver: {
                on: {
                    RESET: 'loggedOutBoth',
                },
                effect({ setContext }) {
                    async function _login() {
                        // just in case
                        if (isRiverAuthencticated) {
                            console.warn('Aborting auto login to river, already logged in')
                            return
                        }
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
