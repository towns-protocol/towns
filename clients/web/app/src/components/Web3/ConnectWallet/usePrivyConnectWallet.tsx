import React, { useCallback, useRef } from 'react'
import { useConnectWallet } from '@privy-io/react-auth'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Analytics } from 'hooks/useAnalytics'
import { mapToErrorMessage } from '../utils'

type Callbacks = Parameters<typeof useConnectWallet>[0]

export function usePrivyConnectWallet(callbacks: Callbacks) {
    const { baseChain } = useEnvironment()
    // privy's useConnectWallet success/error callbacks fire even if the connection was initiated by a different instance
    // so we use this ref to ensure we only process connections initiated by this instance
    const connectInitiatedRef = useRef(false)
    const { connectWallet: privyConnectWallet } = useConnectWallet({
        onSuccess: (wallet) => {
            if (!connectInitiatedRef.current) {
                return
            }
            Analytics.getInstance().track('connected wallet', {
                walletName: wallet.meta.name,
            })
            callbacks?.onSuccess?.(wallet)
            connectInitiatedRef.current = false
        },
        onError: (error) => {
            if (!connectInitiatedRef.current) {
                return
            }
            console.error('[usePrivyConnectWallet] error connecting wallet', error)
            popupToast(({ toast }) => (
                <StandardToast.Error
                    toast={toast}
                    message={`Please make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                    subMessage={mapToErrorMessage({
                        error: new Error(error),
                        source: 'usePrivyConnectWallet privy connect error',
                    })}
                />
            ))
            connectInitiatedRef.current = false
        },
    })

    return useCallback(() => {
        connectInitiatedRef.current = true
        return privyConnectWallet()
    }, [privyConnectWallet])
}
