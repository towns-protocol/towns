import { createConfig, http } from 'wagmi'
import { Chain, zora } from 'wagmi/chains'
import { getViemChain } from '@decent.xyz/box-common'

import { Transport } from 'viem'
import { env } from 'utils'
import { validateAndParseXChainConfig } from 'utils/validateAndParseXChainConfig'

const xchainConfig = validateAndParseXChainConfig(env.VITE_XCHAIN_CONFIG ?? '')

const initialChains = Object.entries(xchainConfig).reduce((acc: Chain[], [chainId, url]) => {
    const chain = getViemChain(Number(chainId))
    if (chain) {
        return [...acc, chain]
    }
    return acc
}, []) as [Chain, ...Chain[]]

const alchemyKey = xchainConfig[initialChains?.[0]?.id]?.split('/').pop()

const initialTransports = initialChains.reduce((acc: Record<number, Transport>, chain) => {
    acc[chain.id] = http(xchainConfig[chain.id])
    return acc
}, {})

// additional chains to support for bridging
const additionalChains: [Chain, string][] = [
    [zora, `https://zora-mainnet.g.alchemy.com/v2/${alchemyKey}`],
]

const chains = initialChains.concat(additionalChains.map(([c]) => c)) as [Chain, ...Chain[]]

const transports = {
    ...initialTransports,
    ...additionalChains.reduce((acc: Record<number, Transport>, [chain, url]) => {
        acc[chain.id] = http(url)
        return acc
    }, {}),
}

export const chainIds = chains.map((chain) => chain.id)

export const wagmiConfig = createConfig({
    chains,
    transports,
})
