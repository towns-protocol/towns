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
    const isCasablancaProtocol = primaryProtocol === SpaceProtocol.Casablanca
    const matrixCredentials = useMatrixCredentials()
    const casablancaCredentials = useCasablancaCredentials()

    const isAuthenticated = isCasablancaProtocol
        ? casablancaCredentials.isAuthenticated
        : matrixCredentials.isAuthenticated
    const loginStatus = isCasablancaProtocol
        ? casablancaCredentials.loginStatus
        : matrixCredentials.loginStatus
    const loginError = isCasablancaProtocol
        ? casablancaCredentials.loginError
        : matrixCredentials.loginError
    const loggedInWalletAddress = isCasablancaProtocol
        ? casablancaCredentials.loggedInWalletAddress
        : matrixCredentials.loggedInWalletAddress

    const {
        loginWithWalletToMatrix,
        registerWalletWithMatrix,
        getIsWalletRegisteredWithMatrix,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
        getIsWalletRegisteredWithCasablanca,
        userOnWrongNetworkForSignIn,
        logout: _logout,
    } = useZionClient()
    const { activeWalletAddress } = useWeb3Context()

    const login = useCallback(async () => {
        return isCasablancaProtocol
            ? await loginWithWalletToCasablanca(loginMsgToSign)
            : await loginWithWalletToMatrix(loginMsgToSign)
    }, [isCasablancaProtocol, loginWithWalletToCasablanca, loginWithWalletToMatrix])

    const register = useCallback(async () => {
        return isCasablancaProtocol
            ? await registerWalletWithCasablanca(registerWalletMsgToSign)
            : await registerWalletWithMatrix(registerWalletMsgToSign)
    }, [isCasablancaProtocol, registerWalletWithCasablanca, registerWalletWithMatrix])

    const getIsWalletRegistered = useCallback(() => {
        return isCasablancaProtocol
            ? getIsWalletRegisteredWithCasablanca()
            : getIsWalletRegisteredWithMatrix()
    }, [getIsWalletRegisteredWithCasablanca, getIsWalletRegisteredWithMatrix, isCasablancaProtocol])

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
