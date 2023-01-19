import { useCallback, useMemo } from 'react'
import { WalletStatus, useMatrixCredentials, useWeb3Context, useZionClient } from 'use-zion-client'
import { useConnect } from 'wagmi'

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Harmony Terms of Service.`

export function useAuth() {
    const { isAuthenticated, loginStatus, loginError } = useMatrixCredentials()
    const { loginWithWallet, registerWallet, logout: _logout } = useZionClient()
    const { walletStatus } = useWeb3Context()
    const { connect: _connect, connectors, error: connectError, pendingConnector } = useConnect()

    const connect = useCallback(() => {
        _connect({ connector: connectors[0] })
    }, [_connect, connectors])

    const login = useCallback(() => {
        loginWithWallet(loginMsgToSign)
    }, [loginWithWallet])

    const register = useCallback(() => {
        registerWallet(registerWalletMsgToSign)
    }, [registerWallet])

    const logout = useCallback(async () => {
        await _logout()
    }, [_logout])

    const isConnected = useMemo(() => {
        return walletStatus === WalletStatus.Connected
    }, [walletStatus])

    const isAuthenticatedAndConnected = useMemo(() => {
        return isAuthenticated && isConnected
    }, [isAuthenticated, isConnected])

    // wagmi's useConnect().isLoading resolves much faster than our own wallet status and so we need to create our own connect loading status
    const connectLoading = useMemo(() => {
        return (
            walletStatus === WalletStatus.Reconnecting || walletStatus === WalletStatus.Connecting
        )
    }, [walletStatus])

    return {
        connect,
        login,
        logout,
        register,
        connectError,
        connectLoading,
        pendingConnector,
        isAuthenticated, // matrix status
        isAuthenticatedAndConnected, // matrix + wallet
        isConnected,
        loginStatus,
        loginError,
        walletStatus,
    }
}
