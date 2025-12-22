import { dlogger } from '@towns-protocol/utils'
import { BASE_MAINNET, BASE_SEPOLIA } from '../../utils/Web3Constants'
import { XchainConfig } from './entitlement'

const log = dlogger('csb:XChainConfig')

const DEFAULT_XCHAIN_IDs = [
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
    isEtherNative: boolean
    isEthereumNetwork: boolean
}

function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null
}

// List of chains used across various deployment environments, and chain metadata.
// These settings are shared with the stream node.
const DEFAULT_BLOCKCHAIN_INFO: { [chainId: number]: BlockchainInfo } = {
    1: { chainId: 1, isEtherNative: true, isEthereumNetwork: true }, // Eth mainnet
    11155111: { chainId: 11155111, isEtherNative: true, isEthereumNetwork: true }, // Eth Sepolia

    137: { chainId: 137, isEtherNative: false, isEthereumNetwork: false }, // Polygon currency is MATIC
    42161: { chainId: 42161, isEtherNative: true, isEthereumNetwork: false }, // Arb
    10: { chainId: 10, isEtherNative: true, isEthereumNetwork: false }, // Optimism

    8453: { chainId: 8453, isEtherNative: true, isEthereumNetwork: false }, // Base
    84532: { chainId: 84532, isEtherNative: true, isEthereumNetwork: false }, // Base Sepolia

    31337: { chainId: 31337, isEtherNative: true, isEthereumNetwork: false }, // Anvil base
    31338: { chainId: 31338, isEtherNative: true, isEthereumNetwork: false }, // Anvil river

    100: { chainId: 100, isEtherNative: false, isEthereumNetwork: false }, // Gnosis mainnet - uses XDai
    10200: { chainId: 10200, isEtherNative: false, isEthereumNetwork: false }, // Gnosis Chiado Testnet
}

export function getDefaultXChainIds(baseChainId: number): number[] {
    const ids = [...DEFAULT_XCHAIN_IDs]

    // if we're not on base mainnet, add the testnet chains
    if (baseChainId !== BASE_MAINNET) {
        ids.push(BASE_SEPOLIA, 11155111)
    }

    return ids
}

function marshallXChainConfig(
    supportedXChainIds: number[],
    supportedXChainRpcMapping: { [chainId: number]: string },
    chainInfo = DEFAULT_BLOCKCHAIN_INFO,
): XchainConfig {
    const filteredByRiverSupported = Object.entries(supportedXChainRpcMapping ?? {}).filter(
        ([chainId, rpcUrl]) => isDefined(rpcUrl) && supportedXChainIds.includes(+chainId),
    )

    if (supportedXChainIds.length !== filteredByRiverSupported.length) {
        log.warn('Some xchain rpc urls are missing from the supported xchains list')
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

    const etherNativeNetworkIds: number[] = Object.keys(supportedRpcUrls)
        .filter((key) => (+key) in chainInfo && chainInfo[+key].isEtherNative)
        .reduce<number[]>((acc, key) => [...acc, +key], [])

    const ethereumNetworkIds: number[] = Object.keys(supportedRpcUrls)
        .filter((key) => (+key) in chainInfo && chainInfo[+key].isEthereumNetwork)
        .reduce<number[]>((acc, key) => [...acc, +key], [])

    return {
        supportedRpcUrls,
        etherNativeNetworkIds,
        ethereumNetworkIds,
    }
}

export function getXchainConfig(
    baseChainId: number,
    supportedXChainRpcMapping: { [chainId: number]: string },
): XchainConfig {
    const xChainIds = getDefaultXChainIds(baseChainId)
    return marshallXChainConfig(xChainIds, supportedXChainRpcMapping)
}
