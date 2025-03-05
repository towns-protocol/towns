import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { parseInt } from 'lodash'
import { z } from 'zod'
import { env } from 'utils'
import { SECOND_MS } from 'data/constants'

export type LifiQuote = {
    id: string
    estimate: {
        approvalAddress: string
        fromAmount: string
        fromAmountUSD: string
        toAmount: string
        toAmountMin: string
        toAmountUSD: string
    }
    type: string
    transactionRequest: {
        chainId?: number | null
        data: string
        from?: string | null
        gasLimit?: string | null
        gasPrice?: string | null
        to?: string | null
        value?: string | null
    }
}

const zLifiQuote: z.ZodType<LifiQuote> = z.object({
    id: z.string(),
    estimate: z.object({
        approvalAddress: z.string(),
        fromAmount: z.string(),
        fromAmountUSD: z.string(),
        toAmount: z.string(),
        toAmountMin: z.string(),
        toAmountUSD: z.string(),
    }),
    type: z.string(),
    transactionRequest: z.object({
        chainId: z.number().nullish(),
        data: z.string(),
        from: z.string().nullish(),
        gasLimit: z.string().nullish(),
        gasPrice: z.string().nullish(),
        to: z.string().nullish(),
        value: z.string().nullish(),
    }),
})

export const useLifiQuote = (props: {
    fromChain: string
    toChain: string
    fromToken: string
    toToken: string
    fromAmount: string
    fromAddress: string
    toAddress: string
    currentTokenBalance: bigint
    slippage: number
}) => {
    const {
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
        toAddress,
        currentTokenBalance,
        slippage,
    } = props

    const remappedFromChain =
        props.fromChain === 'solana-mainnet' ? '1151111081099710' : props.fromChain
    const remappedToChain = props.toChain === 'solana-mainnet' ? '1151111081099710' : props.toChain

    const enabled =
        fromChain.length > 0 &&
        toChain.length > 0 &&
        fromToken.length > 0 &&
        toToken.length > 0 &&
        fromAddress.length > 0 &&
        toAddress.length > 0 &&
        fromAmount.length > 0 &&
        fromToken.length > 0 &&
        parseInt(fromAmount) > 0 &&
        currentTokenBalance > 0n

    const queryKey = [
        'lifiQuote',
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
        toAddress,
    ]

    const { data, error, isError, isLoading } = useQuery({
        queryKey,
        enabled: enabled,
        queryFn: async () => {
            try {
                const result = await axios.get('https://li.quest/v1/quote', {
                    params: {
                        fromChain: remappedFromChain,
                        toChain: remappedToChain,
                        fromToken,
                        toToken,
                        fromAmount,
                        fromAddress,
                        slippage,
                        // toAddress,
                    },
                    headers: {
                        'x-lifi-api-key': env.VITE_LIFI_API_KEY,
                    },
                })
                if (!result.data) {
                    return undefined
                }
                return zLifiQuote.parse(result.data)
            } catch (e) {
                return undefined
            }
        },
        gcTime: SECOND_MS * 30,
    })

    return { data, isLoading, isError, error }
}
