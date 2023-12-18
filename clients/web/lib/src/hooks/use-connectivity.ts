import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'
import { useCasablancaCredentials } from './use-casablanca-credentials'
import { TSigner } from 'types/web3-types'

const loginMsgToSign = `Click to sign in and accept the Towns Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

export function useConnectivity() {
    const casablancaCredentials = useCasablancaCredentials()

    const isAuthenticated = casablancaCredentials.isAuthenticated
    const loginStatus = casablancaCredentials.loginStatus
    const loginError = casablancaCredentials.loginError
    const loggedInWalletAddress = casablancaCredentials.loggedInWalletAddress

    const {
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
        getIsWalletRegisteredWithCasablanca,
        userOnWrongNetworkForSignIn,
        logout: _logout,
    } = useZionClient()

    const login = useCallback(
        async (signer: TSigner) => {
            return await loginWithWalletToCasablanca(loginMsgToSign, signer)
        },
        [loginWithWalletToCasablanca],
    )

    const register = useCallback(
        async (signer: TSigner) => {
            return await registerWalletWithCasablanca(registerWalletMsgToSign, signer)
        },
        [registerWalletWithCasablanca],
    )

    const getIsWalletRegistered = useCallback(() => {
        return getIsWalletRegisteredWithCasablanca()
    }, [getIsWalletRegisteredWithCasablanca])

    const logout = useCallback(async () => {
        await _logout()
    }, [_logout])

    return {
        login,
        logout,
        register,
        getIsWalletRegistered,
        loggedInWalletAddress,
        isAuthenticated, // matrix status
        loginStatus,
        loginError,
        userOnWrongNetworkForSignIn,
    }
}
