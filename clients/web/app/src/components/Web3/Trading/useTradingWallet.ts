import { useQuery } from '@tanstack/react-query'
import { ZodType, z } from 'zod'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'
import { MINUTE_MS } from 'data/constants'
import { ChainWalletAssets, NativeAsset, TokenAsset } from './tradingUtils'
import { useTradingWalletAddresses } from './useTradingWalletAddresses'

const zTokenAsset: ZodType<TokenAsset> = z.object({
    chain: z.string(),
    tokenAddress: z.string(),
    symbol: z.string(),
    name: z.string(),
    balance: z.string(),
    decimals: z.number(),
    imageUrl: z.string(),
    priceCents: z.number(),
    priceChange24h: z.number(),
    holdingValueCents: z.number(),
})

const zNativeAsset: ZodType<NativeAsset> = z.object({
    balance: z.string(),
    priceCents: z.number(),
    priceChange24h: z.number(),
    imageUrl: z.string().optional(),
    holdingValueCents: z.number(),
})

const zChainWalletAssets: ZodType<ChainWalletAssets> = z.object({
    chain: z.string(),
    walletAddress: z.string(),
    nativeAsset: zNativeAsset,
    tokens: z.array(zTokenAsset),
})

const zTownsWalletResponse: ZodType<ChainWalletAssets[]> = z.array(zChainWalletAssets)

export const useTradingWallet = () => {
    const { evmWalletAddress, solanaWalletAddress } = useTradingWalletAddresses()
    const { data, isLoading } = useQuery({
        queryKey: ['walletContents', evmWalletAddress ?? '', solanaWalletAddress ?? ''],
        queryFn: async () => {
            const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
            const response = await axiosClient.get(
                `${TOKENS_SERVER_URL}/api/towns-wallet?evmWalletAddress=${
                    evmWalletAddress ?? ''
                }&solanaWalletAddress=${solanaWalletAddress ?? ''}`,
            )
            return response.data
        },
        select: (data) => {
            const response = zTownsWalletResponse.safeParse(data)
            return response.success ? response.data : undefined
        },
        enabled: !!evmWalletAddress || !!solanaWalletAddress,
        staleTime: MINUTE_MS,
    })

    return { data, isLoading }
}
