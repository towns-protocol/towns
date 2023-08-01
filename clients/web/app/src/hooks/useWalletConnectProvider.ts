import { useConnect } from 'wagmi'
import { useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { useEnvironment } from './useEnvironmnet'

// extracts the provider from the wallet connect connector
export function useWalletConnectProvider() {
    const { chainId } = useEnvironment()

    // with `data`, you only get the connector if you're connected.
    // with `connectors`, we can get the connector even if you're not connected
    const { connectors } = useConnect({
        chainId,
    })
    const walletConnect = connectors?.find((c) => c instanceof WalletConnectConnector)

    const walletConnectConnector = walletConnect

    const [provider, setProvider] =
        useState<Awaited<ReturnType<WalletConnectConnector['getProvider']>>>()

    useEffect(() => {
        let cancel = false
        async function getProvider() {
            if (!walletConnectConnector?.ready) {
                return
            }
            const newProvider = await (
                walletConnectConnector as WalletConnectConnector
            )?.getProvider()

            if (!cancel) {
                setProvider((state) => {
                    if (isEqual(state, newProvider)) {
                        return state
                    }
                    return newProvider
                })
            }
        }

        getProvider()
        return () => {
            cancel = true
        }
    }, [walletConnectConnector])

    return provider
}
