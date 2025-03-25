import { IconName } from '@ui'

export type ChainConfig = {
    name: string
    nativeTokenAddress: string
    icon: IconName
    decimals: number
    chainId: string
    tokenSymbol: string
    analyticName: 'Solana' | 'ETH'
}

export const tradingChains = {
    'solana-mainnet': {
        name: 'Solana',
        nativeTokenAddress: '11111111111111111111111111111111',
        icon: 'solana',
        decimals: 9,
        chainId: 'solana-mainnet',
        tokenSymbol: 'SOL',
        analyticName: 'Solana',
    },
    '8453': {
        name: 'Base',
        nativeTokenAddress: '0x0000000000000000000000000000000000000000',
        icon: 'ethFilled',
        decimals: 18,
        chainId: '8453',
        tokenSymbol: 'ETH',
        analyticName: 'ETH',
    },
    '1': {
        name: 'Ethereum',
        nativeTokenAddress: '0x0000000000000000000000000000000000000000',
        icon: 'ethFilled',
        decimals: 18,
        chainId: '1',
        tokenSymbol: 'ETH',
        analyticName: 'ETH',
    },
} as const satisfies Record<string, ChainConfig>

export const isTradingChain = (chainId: string): chainId is keyof typeof tradingChains => {
    return chainId in tradingChains
}
