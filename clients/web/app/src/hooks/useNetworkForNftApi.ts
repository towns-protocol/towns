import { useMemo } from 'react'
import { env, hasQueryParam } from 'utils'
import { useEnvironment } from 'hooks/useEnvironmnet'

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

const NETWORK_NAME_MAP: Record<number, string | undefined> = {
    5: GOERLI,
    1: MAINNET,
    11155111: SEPOLIA,
    31337: undefined,
}

// This is for making calls to token-worker. It does not impact the chain configured in the lib setup for the spaceDapp
// The network names correspond to Alchemy's network names for their NFT API. The worker maps the names to chain id so it can be used with Infura as well
export const useNetworkForNftApi = () => {
    const { chainId } = useEnvironment()
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

        const networkName = NETWORK_NAME_MAP[chainId]
        if (!networkName) {
            console.warn('no Nft Api network configured for chain id', chainId)
            return ''
        }
        return networkName
    }, [chainId])
}
