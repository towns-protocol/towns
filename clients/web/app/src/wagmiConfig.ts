import { http } from 'wagmi'
import { createConfig } from '@privy-io/wagmi'
import { Chain } from 'wagmi/chains'
import { getViemChain } from '@decent.xyz/box-common'

import { Transport } from 'viem'
import { env } from 'utils'
import { validateAndParseXChainConfig } from 'utils/validateAndParseXChainConfig'
import { SUPPORTED_CHAINS } from 'privy/PrivyProvider'

const privyChains = SUPPORTED_CHAINS
const transports = privyChains.reduce((acc: Record<number, Transport>, chain) => {
    acc[chain.id] = http(chain.rpcUrls.default.http[0])
    return acc
}, {})

const xchainConfig = validateAndParseXChainConfig(env.VITE_XCHAIN_CONFIG ?? '')

const xChains = Object.entries(xchainConfig).reduce((acc: Chain[], [chainId, url]) => {
    const chain = getViemChain(Number(chainId))
    if (chain) {
        const privyChain = privyChains.find((c) => c.id === chain.id)
        if (privyChain) {
            return acc
        }
        return [...acc, chain]
    }
    return acc
}, [])

const xChainTransports = xChains.reduce((acc: Record<number, Transport>, chain) => {
    acc[chain.id] = http(xchainConfig[chain.id])
    return acc
}, {})

const chains = privyChains.concat(xChains) as [Chain, ...Chain[]]

export const chainIds = chains.map((chain) => chain.id)

export const wagmiConfig = createConfig({
    chains,
    transports: { ...transports, ...xChainTransports },
})
