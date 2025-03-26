import { useQuery } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
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
        currentTokenBalance >= BigInt(fromAmount)

    const queryKey = [
        'lifiQuote',
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
        toAddress,
        slippage,
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
                        integrator: env.VITE_LIFI_INTEGRATOR_ID,
                        fee: env.VITE_LIFI_INTEGRATOR_ID ? env.VITE_LIFI_FEE : undefined, // The percent of the integrator's fee that is taken from every transaction. 0.02 represents 2%. The maximum fee amount is 10%.
                    },
                    headers: {
                        'x-lifi-api-key': env.VITE_LIFI_API_KEY,
                    },
                })
                if (!result.data) {
                    throw new Error('No data')
                }
                return zLifiQuote.parse(result.data)
            } catch (e) {
                console.error(e)
                if (e instanceof AxiosError) {
                    switch (e.response?.data?.code) {
                        case 1003:
                            throw new Error('Token not found')
                        default:
                            if (e.response?.data?.message) {
                                throw new Error(e.response?.data?.message)
                            } else {
                                throw new Error('No route found')
                            }
                    }
                }
                throw e
            }
        },
        staleTime: SECOND_MS * 30,
    })

    return { data, isLoading, isError, error }
}
