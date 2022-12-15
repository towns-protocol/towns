import { useCallback, useMemo } from 'react'
import { WalletStatus, useMatrixStore, useWeb3Context, useZionClient } from 'use-zion-client'
import { useConnect } from 'wagmi'

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`
export const registerWalletMsgToSign = `Click to register and accept the Harmony Terms of Service.`

export function useAuth() {
    const { isAuthenticated, loginStatus, loginError } = useMatrixStore()
    const { loginWithWallet, registerWallet, logout: _logout } = useZionClient()
    const { walletStatus } = useWeb3Context()
    const {
        connect: _connect,
        connectors,
        error: connectError,
        isLoading: connectLoading,
        pendingConnector,
    } = useConnect()

    const connect = useCallback(() => {
        _connect({ connector: connectors[0] })
    }, [_connect, connectors])

    const login = useCallback(() => {
        loginWithWallet(loginMsgToSign)
    }, [loginWithWallet])

    const register = useCallback(() => {
        registerWallet(registerWalletMsgToSign)
    }, [registerWallet])

    const logout = useCallback(() => {
        _logout()
    }, [_logout])

    const isConnected = useMemo(() => {
        return walletStatus === WalletStatus.Connected
    }, [walletStatus])

    const isAuthenticatedAndConnected = useMemo(() => {
        return isAuthenticated && isConnected
    }, [isAuthenticated, isConnected])

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
