import { useBalanceOnChain } from '../useBalanceOnChain'
import { useSolanaBalance } from '../useSolanaBalance'
import { isTradingChain, tradingChains } from '../tradingConstants'
import { useTradingWalletAddresses } from '../useTradingWalletAddresses'

export const useTradingWalletBalance = ({ chainId }: { chainId: string }) => {
    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]
    const isSolana = chainConfig.name === 'Solana'

    const { evmWalletAddress, solanaWalletAddress } = useTradingWalletAddresses()

    const { data: solanaBalance } = useSolanaBalance(solanaWalletAddress)
    const { data: ethBalance } = useBalanceOnChain(evmWalletAddress, 8453)

    return {
        walletBalance: isSolana ? solanaBalance : ethBalance,
        walletAddress: isSolana ? solanaWalletAddress : evmWalletAddress,
    }
}
