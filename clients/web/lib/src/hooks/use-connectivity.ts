import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useMatrixCredentials } from './use-matrix-credentials'
import { useCasablancaCredentials } from './use-casablanca-credentials'
import { useZionContext } from '../components/ZionContextProvider'
import { SpaceProtocol } from '../client/ZionClientTypes'

const loginMsgToSign = `Click to sign in and accept the Towns Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

export function useConnectivity() {
    const { primaryProtocol } = useZionContext()
    const loginWithCasablanca = primaryProtocol === SpaceProtocol.Casablanca
    const matrixCredentials = useMatrixCredentials()
    const casablancaCredentials = useCasablancaCredentials()

    const isAuthenticated = loginWithCasablanca
        ? casablancaCredentials.isAuthenticated
        : matrixCredentials.isAuthenticated
    const loginStatus = loginWithCasablanca
        ? casablancaCredentials.loginStatus
        : matrixCredentials.loginStatus
    const loginError = loginWithCasablanca
        ? casablancaCredentials.loginError
        : matrixCredentials.loginError
    const loggedInWalletAddress = loginWithCasablanca
        ? casablancaCredentials.loggedInWalletAddress
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

    const login = loginWithCasablanca ? riverLogin : matrixLogin
    const register = loginWithCasablanca ? riverRegister : matrixRegister

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
