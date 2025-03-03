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
}

export const useOnPressTrade = (props: Props) => {
    const { chainId, request } = props
    const tradingContext = useTradingContext()

    const onPressTrade = useCallback(
        async (getSigner: (() => Promise<TSigner | undefined>) | undefined) => {
            if (!chainId) {
                throw new Error('chainId is required')
            }
            if (isSolanaTransactionRequest(request)) {
                if (chainId !== tradingChains['solana-mainnet'].chainId) {
                    console.error("chainId doesn't match")
                    return
                }
                tradingContext.sendSolanaTransaction(request)
            } else if (isEvmTransactionRequest(request)) {
                if (!getSigner) {
                    throw new Error('getSigner is required')
                }
                const signer = await getSigner()
                if (chainId !== '8453' || !signer) {
                    return
                }
                tradingContext.sendEvmTransaction(request, signer)
            }
        },
        [chainId, tradingContext, request],
    )

    return { onPressTrade: request ? onPressTrade : undefined }
}
