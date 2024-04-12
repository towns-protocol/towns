import { useMemo } from 'react'
import { useConnectivity } from 'use-towns-client'
import { useCombinedAuth } from 'privy/useCombinedAuth'

export function useConnectedStatus() {
    // immediately returns river auth status
    const { isAuthenticated } = useConnectivity()
    // waits until embedded wallet is connected
    const { isConnected } = useCombinedAuth()
    return useMemo(() => {
        if (!isAuthenticated) {
            return { connected: false, isLoading: false }
        }
        if (!isConnected) {
            return { connected: false, isLoading: true }
        }
        return { connected: true, isLoading: false }
    }, [isAuthenticated, isConnected])
}
