import { WalletStatus, useConnectivity } from 'use-zion-client'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useCallback, useMemo } from 'react'

import { keccak256 } from 'ethers/lib/utils.js'
import { useAnalytics } from './useAnalytics'

export const registerWalletMsgToSign = `Click to register and accept the Towns Terms of Service.`

export function useAuth() {
    const {
        login,
        logout,
        register,
        activeWalletAddress,
        loggedInWalletAddress,
        isAuthenticated, // matrix status
        loginStatus,
        loginError,
        userOnWrongNetworkForSignIn,
        getIsWalletRegistered,
    } = useConnectivity()

    const { disconnect } = useDisconnect()

    // Something to note: there seems to be a race condition that can appear within Wagmi - status can be stuck at "reconnecting" when first loading the app in a new tab.
    // Even though status === 'reconnecting' (and isReconnecting === true), simultaneously isConnected === true.
    const { status, isConnected } = useAccount()

    const isAuthenticatedAndConnected = useMemo(() => {
        return isAuthenticated && isConnected
    }, [isAuthenticated, isConnected])

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

    const connector = useMemo(() => {
        return connectors.length > 0 ? connectors[0] : undefined
    }, [connectors])

    const connect = useCallback(() => {
        if (connector) {
            _connect({ connector })
        }
    }, [_connect, connector])

    return {
        connect,
        disconnect,
        login,
        logout,
        register,
        getIsWalletRegistered,
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
