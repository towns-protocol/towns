import { useCallback, useRef } from 'react'
import { useConnectWallet } from '@privy-io/react-auth'

type Callbacks = Parameters<typeof useConnectWallet>[0]

export function usePrivyConnectWallet(callbacks: Callbacks) {
    // privy's useConnectWallet success/error callbacks fire even if the connection was initiated by a different instance
    // so we use this ref to ensure we only process connections initiated by this instance
    const connectInitiatedRef = useRef(false)
    const { connectWallet: privyConnectWallet } = useConnectWallet({
        onSuccess: (wallet) => {
            if (!connectInitiatedRef.current) {
                return
            }
            callbacks?.onSuccess?.(wallet)
            connectInitiatedRef.current = false
        },
        onError: (error) => {
            if (!connectInitiatedRef.current) {
                return
            }
            callbacks?.onError?.(error)
            connectInitiatedRef.current = false
        },
    })

    return useCallback(() => {
        connectInitiatedRef.current = true
        return privyConnectWallet()
    }, [privyConnectWallet])
}
