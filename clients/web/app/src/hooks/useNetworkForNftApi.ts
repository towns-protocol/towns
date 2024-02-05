import { useMemo } from 'react'
import { env, hasQueryParam } from 'utils'
import { useEnvironment } from 'hooks/useEnvironmnet'

// For debugging
// Use ?mainnet to grab tokens from mainnet
// when fetching tokens for a wallet
export const hasMainnetParam = () => {
    return hasQueryParam('mainnet')
}

export const hasBaseSepoliaParam = () => {
    return hasQueryParam('base_sepolia')
}

export const fetchMainnetTokens = env.DEV && hasMainnetParam()
export const fetchBaseSepolia = env.DEV && hasBaseSepoliaParam()
// random address from opensea with tokens on mainnet
export const mainnetTokenAddress = env.VITE_ADDRESS_FOR_MAINNET_TOKENS_DEV
const MAINNET = 'eth-mainnet'
const BASE_SEPOLIA = 'base-sepolia'

const NETWORK_NAME_MAP: Record<number, string | undefined> = {
    1: MAINNET,
    84532: BASE_SEPOLIA,
    31337: undefined,
}

// This is for making calls to token-worker. It does not impact the chain configured in the lib setup for the spaceDapp
// The network names correspond to Alchemy's network names for their NFT API. The worker maps the names to chain id so it can be used with Infura as well
export const useNetworkForNftApi = () => {
    const { chainId } = useEnvironment()
    return useMemo(() => {
        // special cases that only apply for local testing against different alchmey urls
        // fetch mainnet tokens
        if (fetchMainnetTokens) {
            return MAINNET
        }

        // fetch tokens from sepolia - useful if you are pointing to local homeserver but want to grab your tokens from sepolia
        if (fetchBaseSepolia) {
            return BASE_SEPOLIA
        }

        const networkName = NETWORK_NAME_MAP[chainId]
        if (!networkName) {
            console.warn('no Nft Api network configured for chain id', chainId)
            return ''
        }
        return networkName
    }, [chainId])
}
