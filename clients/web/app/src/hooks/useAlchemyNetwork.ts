import { useMemo } from 'react'
import { env, hasGoerliParam, hasVitalkTokensParam } from 'utils'
import { HomeServerUrl, useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'

export const fetchVitalikTokens = env.IS_DEV && hasVitalkTokensParam()
export const fetchGoerli = env.IS_DEV && hasGoerliParam()
const GOERLI = 'eth-goerli'
const MAINNET = 'eth-mainnet'
const SEPOLIA = 'eth-sepolia'

// This is for making calls to alcemy NFT API via the token-worker. It does not impact the chain configured in the lib setup for the spaceDapp
export const useAlchemyNetworkForNFTAPI = () => {
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
            // local shouldn't use any alchemy by default
            case HomeServerUrl.LOCAL:
            default:
                console.warn('no alchemy network configured for homeserver url', homeserverUrl)
                return ''
        }
    }, [homeserverUrl])
}
