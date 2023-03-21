import { foundry, goerli, sepolia } from 'wagmi/chains'
import { useMemo } from 'react'
import { HomeServerUrl, useMatrixHomeServerUrl } from './useMatrixHomeServerUrl'

// transactions should always be against a specific chain
// in prod, this is always sepolia
// in dev, this could be foundry, goerli or sepolia, depending on where your server is pointed
export const useCorrectChainForServer = () => {
    const { homeserverUrl } = useMatrixHomeServerUrl()
    const chain = useMemo(() => {
        switch (homeserverUrl) {
            case HomeServerUrl.PROD:
                return sepolia
            case HomeServerUrl.TEST:
                return goerli
            case HomeServerUrl.LOCAL:
                return foundry
            default:
                console.warn('unknown homeserver url', homeserverUrl, 'defaulting to foundry')
                return foundry
        }
    }, [homeserverUrl])
    return chain
}
