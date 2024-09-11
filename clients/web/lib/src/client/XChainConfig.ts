import { BASE_MAINNET, BASE_SEPOLIA, XchainConfig } from '@river-build/web3'
import { isDefined } from '@river-build/sdk'

const defaultXChainIds = [
    // ethereum
    1,
    // polygon
    137,
    // arb
    42161,
    // optimism
    10,
    // base
    8453,
]

type BlockchainInfo = {
    chainId: number
    isEtherChain: boolean
}

// List of chains used across various deployment environments, and chain metadata.
// These settings are shared with the stream node.
const defaultBlockchainInfo: { [chainId: number]: BlockchainInfo } = {
    1: { chainId: 1, isEtherChain: true }, // Eth mainnet
    11155111: { chainId: 11155111, isEtherChain: true }, // Eth Sepolia

    137: { chainId: 137, isEtherChain: false }, // Polygon currency is MATIC
    42161: { chainId: 42161, isEtherChain: true }, // Arb
    10: { chainId: 10, isEtherChain: true }, // Optimism

    8453: { chainId: 8453, isEtherChain: true }, // Base
    84532: { chainId: 84532, isEtherChain: true }, // Base Sepolia

    31337: { chainId: 31337, isEtherChain: true }, // Anvil base
    31338: { chainId: 31338, isEtherChain: true }, // Anvil river

    100: { chainId: 100, isEtherChain: false }, // Gnosis mainnet - uses XDai
    10200: { chainId: 10200, isEtherChain: false }, // Gnosis Chiado Testnet
}

export function getDefaultXChainIds(baseChainId: number): number[] {
    const ids = [...defaultXChainIds]

    // if we're not on base mainnet, add the testnet chains
    if (baseChainId !== BASE_MAINNET) {
        ids.push(BASE_SEPOLIA, 11155111)
    }

    return ids
}

export function marshallXChainConfig(
    supportedXChainIds: number[],
    supportedXChainRpcMapping: { [chainId: number]: string },
    chainInfo = defaultBlockchainInfo,
): XchainConfig {
    const filteredByRiverSupported = Object.entries(supportedXChainRpcMapping ?? {}).filter(
        ([chainId, rpcUrl]) => isDefined(rpcUrl) && supportedXChainIds.includes(+chainId),
    )

    if (supportedXChainIds.length !== filteredByRiverSupported.length) {
        console.warn('Some xchain rpc urls are missing from the supported xchains list')
    }

    const supportedRpcUrls = filteredByRiverSupported.reduce<{ [id: number]: string }>(
        (acc, kvpair) => {
            return {
                ...acc,
                [+kvpair[0]]: kvpair[1],
            }
        },
        {},
    )

    const etherBasedChains: number[] = Object.keys(supportedRpcUrls)
        .filter((key) => +key in chainInfo && chainInfo[+key].isEtherChain)
        .reduce<number[]>((acc, key) => [...acc, +key], [])

    return {
        supportedRpcUrls,
        etherBasedChains,
    }
}
