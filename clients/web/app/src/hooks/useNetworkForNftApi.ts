import { useMemo } from 'react'
import { env, hasQueryParam } from 'utils'
import { HomeServerUrl, useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'

// For debugging
// Use ?vitalikTokens to grab Vitalik's tokens from mainnet
// when fetching tokens for a wallet
export const hasVitalkTokensParam = () => {
    return hasQueryParam('vitalikTokens')
}

export const hasGoerliParam = () => {
    return hasQueryParam('goerli')
}

export const fetchVitalikTokens = env.IS_DEV && hasVitalkTokensParam()
export const fetchGoerli = env.IS_DEV && hasGoerliParam()
export const vitalikAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
const GOERLI = 'eth-goerli'
const MAINNET = 'eth-mainnet'
const SEPOLIA = 'eth-sepolia'

// This is for making calls to token-worker. It does not impact the chain configured in the lib setup for the spaceDapp
// The network names correspond to Alchemy's network names for their NFT API. The worker maps the names to chain id so it can be used with Infura as well
export const useNetworkForNftApi = () => {
    const { homeserverUrl } = useMatrixHomeServerUrl()
    return useMemo(() => {
        // special cases that only apply for local testing against different alchmey urls
        // fetch vitalik's tokens so we can see how a ton of tokens looks in the UI
        if (fetchVitalikTokens) {
            return MAINNET
        }
        // fetch tokens from goerli - useful if you are pointing to local homeserver but want to grab your tokens from goerli
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
