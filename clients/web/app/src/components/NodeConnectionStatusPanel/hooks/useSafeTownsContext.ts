import { useContext } from 'react'
import { TownsContext } from 'use-towns-client'

// this allows useConnectionStatus to be used outside of a TownsContextProvider
// which is the case for the ErrorReport on the public town page, and a couple other places
export function useSafeTownsContext() {
    const context = useContext(TownsContext)

    if (!context) {
        console.warn('useSafeTownsContext: no context found')
        return {
            casablancaClient: undefined,
            clientStatus: undefined,
            riverProvider: undefined,
            riverConfig: undefined,
        }
    }

    return {
        casablancaClient: context.casablancaClient,
        clientStatus: context.clientStatus,
        riverProvider: context.riverProvider,
        riverConfig: context.riverConfig,
    }
}
