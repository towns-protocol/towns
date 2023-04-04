import { useCallback, useMemo } from 'react'
import { WalletStatus, useMatrixCredentials, useWeb3Context, useZionClient } from 'use-zion-client'
import { useAccount, useConnect } from 'wagmi'
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
    const { track, setUserId } = useAnalytics()
    const {
        connect: _connect,
        connectors,
        error: connectError,
        pendingConnector,
    } = useConnect({
        onSuccess: () => {
            // jterzis somewhat of a hack to set a stable, obfuscated uid derived off the wallet address
            setUserId(keccak256(activeWalletAddress as string).substring(0, 34))
            track('wallet_connect_success')
        },
        onError: (error) => {
            track('wallet_connect_error', {
                error: error.message,
            })
        },
    })

    // useWeb3Context().walletStatus sometimes hangs at 'reconnecting' on first load (cannot reproduce locally) - why?? - which causes our app to hang in the loading/login screen
    // reusing useAccount() here to get the wallet status in more directly, maybe that will fix it
    const { status } = useAccount()

    const connect = useCallback(() => {
        _connect({ connector: connectors[0] })
    }, [_connect, connectors])

    const login = useCallback(async () => {
        await loginWithWalletToMatrix(loginMsgToSign)
    }, [loginWithWalletToMatrix])

    const register = useCallback(async () => {
        await registerWalletWithMatrix(registerWalletMsgToSign)
    }, [registerWalletWithMatrix])

    const logout = useCallback(async () => {
        await _logout()
    }, [_logout])

    const isConnected = useMemo(() => {
        return status === WalletStatus.Connected
    }, [status])

    const isAuthenticatedAndConnected = useMemo(() => {
        return isAuthenticated && isConnected
    }, [isAuthenticated, isConnected])

    const connectLoading = useMemo(() => {
        return status === WalletStatus.Reconnecting || status === WalletStatus.Connecting
    }, [status])

    return {
        connect,
        login,
        logout,
        register,
        activeWalletAddress,
        loggedInWalletAddress,
        connectError,
        connectLoading,
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
