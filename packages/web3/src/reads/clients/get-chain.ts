import { baseSepolia, base, foundry } from 'viem/chains'

const chains = [base, baseSepolia, foundry] as const

export type ChainId = 8453 | 84532 | 31337

export const isChainId = (chainId: number): chainId is ChainId => {
    return chains.some((chain) => chain.id === chainId)
}

export const getChain = (chainId: ChainId) => {
    return chains.find((chain) => chain.id === chainId)
}
