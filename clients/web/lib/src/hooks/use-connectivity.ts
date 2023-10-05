import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useCasablancaCredentials } from './use-casablanca-credentials'

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
    const { activeWalletAddress } = useWeb3Context()

    const login = useCallback(async () => {
        return await loginWithWalletToCasablanca(loginMsgToSign)
    }, [loginWithWalletToCasablanca])

    const register = useCallback(async () => {
        return await registerWalletWithCasablanca(registerWalletMsgToSign)
    }, [registerWalletWithCasablanca])

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
        activeWalletAddress,
        loggedInWalletAddress,
        isAuthenticated, // matrix status
        loginStatus,
        loginError,
        userOnWrongNetworkForSignIn,
    }
}
