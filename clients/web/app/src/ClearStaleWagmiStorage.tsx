import { useEffect } from 'react'
import { findLocalStorageKeys } from 'utils'

// es 10/31/2023
// Wagmi storage keys are conflicting with Privy integration. These keys were stored in localStorage when using Wagmi w/o Privy and connecting with wallet extension:
// wagmi.connected
// wagmi.wallet
// wagmi.injected.shimDisconnect - true - probably this was the cause of the issue - https://wagmi.sh/react/connectors/injected#shimdisconnect
// Removing these keys because they are no longer set with Privy integration.
//
// Privy has its own Wagmi config that uses a privy connector, which I don't think we have eyes into.
// The only wagmi items stored via privy are:
// wagmi.store
// wagmi.cache
// Which were also set on our previous non-privy integration
export function ClearStaleWagmiStorage() {
    useEffect(() => {
        const staleWagmiKeys = findLocalStorageKeys(
            /^wagmi\.(injected|metamask)\.shimDisconnect$|^wagmi\.connected$|^wagmi\.wallet$/,
        )
        const deleteResults = (results: string[]) =>
            results.forEach((key) => localStorage.removeItem(key))

        if (staleWagmiKeys.length) {
            deleteResults(staleWagmiKeys)
            window.location.reload()
        }
    }, [])

    return null
}
