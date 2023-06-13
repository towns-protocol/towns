import {
    useCasablancaCredentials,
    useMatrixCredentials,
    useWeb3Context,
    useZionClient,
} from 'use-zion-client'
import { useCallback } from 'react'

import { env } from 'utils'

const loginMsgToSign = `Click to sign in and accept the Towns Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

export function useConnectivity() {
    const loginWithRiver = env.VITE_PRIMARY_PROTOCOL === 'river' ? true : false

    const matrixCredentials = useMatrixCredentials()
    const riverCridentials = useCasablancaCredentials()

    const isAuthenticated = loginWithRiver
        ? riverCridentials.isAuthenticated
        : matrixCredentials.isAuthenticated
    const loginStatus = loginWithRiver
        ? riverCridentials.loginStatus
        : matrixCredentials.loginStatus
    const loginError = loginWithRiver ? riverCridentials.loginError : matrixCredentials.loginError
    const loggedInWalletAddress = loginWithRiver
        ? riverCridentials.loggedInWalletAddress
        : matrixCredentials.loggedInWalletAddress

    const {
        loginWithWalletToMatrix,
        registerWalletWithMatrix,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
        userOnWrongNetworkForSignIn,
        logout: _logout,
    } = useZionClient()
    const { activeWalletAddress } = useWeb3Context()

    const matrixLogin = useCallback(async () => {
        await loginWithWalletToMatrix(loginMsgToSign)
    }, [loginWithWalletToMatrix])

    const matrixRegister = useCallback(async () => {
        await registerWalletWithMatrix(registerWalletMsgToSign)
    }, [registerWalletWithMatrix])

    const riverLogin = useCallback(async () => {
        await loginWithWalletToCasablanca(loginMsgToSign)
    }, [loginWithWalletToCasablanca])

    const riverRegister = useCallback(async () => {
        await registerWalletWithCasablanca(registerWalletMsgToSign)
    }, [registerWalletWithCasablanca])

    const login = loginWithRiver ? riverLogin : matrixLogin
    const register = loginWithRiver ? riverRegister : matrixRegister

    const logout = useCallback(async () => {
        await _logout()
    }, [_logout])

    return {
        login,
        logout,
        register,
        activeWalletAddress,
        loggedInWalletAddress,
        isAuthenticated, // matrix status
        loginStatus,
        loginError,
        userOnWrongNetworkForSignIn,
    }
}
