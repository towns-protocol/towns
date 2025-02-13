import { useMemo } from 'react'
import { useTradingWallet } from './useTradingWallet'

export const useTokenBalance = (chainId: string, tokenAddress: string) => {
    const { data } = useTradingWallet()
    return useMemo(() => {
        if (!data) {
            return 0n
        }
        const chainConversion = () => {
            switch (chainId) {
                case '1151111081099710':
                    return 'solana-mainnet'
                case '8453':
                    return 'base'
                default:
                    return undefined
            }
        }
        const chain = chainConversion()
        if (!chain) {
            return 0n
        }
        const nativeAsset = data.find((asset) => asset.chain === chain)
        if (!nativeAsset) {
            return 0n
        }
        const token = nativeAsset.tokens.find((token) => token.tokenAddress === tokenAddress)
        return token?.balance ? BigInt(token.balance) : 0n
    }, [data, tokenAddress, chainId])
}
