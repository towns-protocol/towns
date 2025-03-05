import { useCallback } from 'react'
import { TSigner } from 'use-towns-client'
import {
    EvmTransactionRequest,
    SolanaTransactionRequest,
    isEvmTransactionRequest,
    isSolanaTransactionRequest,
    useTradingContext,
} from '../TradingContextProvider'
import { tradingChains } from '../tradingConstants'

type Props = {
    request: EvmTransactionRequest | SolanaTransactionRequest | undefined
    chainId?: string
    skipPendingToast?: boolean
}

export const useSendTradeTransaction = (props: Props) => {
    const { chainId, request, skipPendingToast } = props
    const tradingContext = useTradingContext()

    const sendTradeTransaction = useCallback(
        async (getSigner: (() => Promise<TSigner | undefined>) | undefined) => {
            if (!chainId) {
                throw new Error('chainId is required')
            }
            if (isSolanaTransactionRequest(request)) {
                if (chainId !== tradingChains['solana-mainnet'].chainId) {
                    console.error("chainId doesn't match")
                    return
                }
                await tradingContext.sendSolanaTransaction(request, { skipPendingToast })
            } else if (isEvmTransactionRequest(request)) {
                if (!getSigner) {
                    throw new Error('getSigner is required')
                }
                const signer = await getSigner()
                if (chainId !== '8453' || !signer) {
                    return
                }
                await tradingContext.sendEvmTransaction(request, signer, { skipPendingToast })
            }
        },
        [chainId, request, tradingContext, skipPendingToast],
    )

    return { sendTradeTransaction: request ? sendTradeTransaction : undefined }
}
