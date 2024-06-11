import { useCallback } from 'react'
import { useTownsClient } from './use-towns-client'
import { useCasablancaCredentials } from './use-casablanca-credentials'
import { TSigner } from 'types/web3-types'

const loginMsgToSign = `Click to sign in and accept the Towns Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

export function useConnectivity() {
    const { isAuthenticated, authStatus, authError, loggedInWalletAddress } =
        useCasablancaCredentials()

    const {
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
        getIsWalletRegisteredWithCasablanca,
        logout: _logout,
    } = useTownsClient()

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
        isAuthenticated, // authenticated with River node or not
        authStatus,
        authError,
    }
}
