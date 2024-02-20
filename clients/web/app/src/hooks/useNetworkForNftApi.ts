import { baseSepolia, mainnet } from 'viem/chains'
import { env, hasQueryParam } from 'utils'

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

// This is for making calls to token-worker.
// todo evan - this needs updates for xchain
export const useNetworkForNftApi = () => {
    // special cases that only apply for local testing against different alchmey urls
    // fetch mainnet tokens
    if (fetchMainnetTokens) {
        return mainnet.id
    }

    // fetch tokens from sepolia - useful if you are pointing to local homeserver but want to grab your tokens from sepolia
    if (fetchBaseSepolia) {
        return baseSepolia.id
    }

    // todo evan
    return baseSepolia.id
}
