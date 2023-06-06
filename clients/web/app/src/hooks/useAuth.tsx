import { WalletStatus, useMatrixCredentials, useWeb3Context, useZionClient } from 'use-zion-client'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useCallback, useMemo } from 'react'

import { keccak256 } from 'ethers/lib/utils.js'
import { useAnalytics } from './useAnalytics'

const loginMsgToSign = `Click to sign in and accept the Towns Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

export function useAuth() {
    const { isAuthenticated, loginStatus, loginError, loggedInWalletAddress } =
        useMatrixCredentials()
    const {
        loginWithWalletToMatrix,
        registerWalletWithMatrix,
        logout: _logout,
        userOnWrongNetworkForSignIn,
    } = useZionClient()
    const { activeWalletAddress } = useWeb3Context()
    const { track, setUserId, getUserId } = useAnalytics()
    const {
        connect: _connect,
        connectors,
        error: connectError,
        pendingConnector,
    } = useConnect({
        onError: (error) => {
            const userId = getUserId()
            if (userId == undefined) {
                setUserId(keccak256(loggedInWalletAddress as string).substring(0, 34))
            }
            track('wallet_connect_error', {
                error: error.message,
            })
        },
    })

    const { disconnect } = useDisconnect()

    // Something to note: there seems to be a race condition that can appear within Wagmi - status can be stuck at "reconnecting" when first loading the app in a new tab.
    // Even though status === 'reconnecting' (and isReconnecting === true), simultaneously isConnected === true.
    const { status, isConnected } = useAccount()

    const connector = useMemo(() => {
        return connectors.length > 0 ? connectors[0] : undefined
    }, [connectors])

    const connect = useCallback(() => {
        if (connector) {
            _connect({ connector })
        }
    }, [_connect, connector])

    const login = useCallback(async () => {
        await loginWithWalletToMatrix(loginMsgToSign)
    }, [loginWithWalletToMatrix])

    const register = useCallback(async () => {
        await registerWalletWithMatrix(registerWalletMsgToSign)
    }, [registerWalletWithMatrix])

    const logout = useCallback(async () => {
        await _logout()
    }, [_logout])

    const isAuthenticatedAndConnected = useMemo(() => {
        return isAuthenticated && isConnected
    }, [isAuthenticated, isConnected])

    return {
        connect,
        disconnect,
        login,
        logout,
        register,
        activeWalletAddress,
        loggedInWalletAddress,
        connectError,
        pendingConnector,
        isAuthenticated, // matrix status
        isAuthenticatedAndConnected, // matrix + wallet
        isConnected,
        loginStatus,
        loginError,
        walletStatus: status as WalletStatus,
        userOnWrongNetworkForSignIn,
    }
}
