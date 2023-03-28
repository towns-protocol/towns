import { useMemo } from 'react'
import { env, hasGoerliParam, hasVitalkTokensParam } from 'utils'
import { HomeServerUrl, useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'

export const fetchVitalikTokens = env.IS_DEV && hasVitalkTokensParam()
export const fetchGoerli = env.IS_DEV && hasGoerliParam()
const GOERLI = 'eth-goerli'
const MAINNET = 'eth-mainnet'
const SEPOLIA = 'eth-sepolia'

// This is for making calls to token-worker. It does not impact the chain configured in the lib setup for the spaceDapp
// The network names correspond to Alchemy's network names for their NFT API. The worker maps the names to chain id so it can be used with Infura as well
export const useNetworkForNftApi = () => {
    const { homeserverUrl } = useMatrixHomeServerUrl()
    return useMemo(() => {
        // special cases that only apply for local testing against different alchmey urls
        if (fetchVitalikTokens) {
            return MAINNET
        }
        if (fetchGoerli) {
            return GOERLI
        }

        switch (homeserverUrl) {
            case HomeServerUrl.PROD:
                return SEPOLIA
            case HomeServerUrl.TEST:
                return GOERLI
            // local shouldn't have a default network
            case HomeServerUrl.LOCAL:
            default:
                console.warn('no Nft Api network configured for homeserver url', homeserverUrl)
                return ''
        }
    }, [homeserverUrl])
}
