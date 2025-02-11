import { useQuery } from '@tanstack/react-query'
import { ZodType, z } from 'zod'
import { useConnectivity } from 'use-towns-client'
import { useSolanaWallets } from '@privy-io/react-auth'
import { useMemo } from 'react'
import { env } from 'utils'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { axiosClient } from 'api/apiClient'
import { ChainWalletAssets, NativeAsset, TokenAsset } from './tradingUtils'

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
    coinGeckoIdentifier: z.string(),
    walletAddress: z.string(),
    nativeAsset: zNativeAsset,
    tokens: z.array(zTokenAsset),
})

const zTownsWalletResponse: ZodType<ChainWalletAssets[]> = z.array(zChainWalletAssets)

export const useTradingWallet = () => {
    const { wallets: solanaWallets } = useSolanaWallets()
    const solanaWallet = useMemo(
        () => solanaWallets.find((w) => w.walletClientType === 'privy'),
        [solanaWallets],
    )

    const { loggedInWalletAddress } = useConnectivity()
    const { data: evmWalletAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { data, isLoading } = useQuery({
        queryKey: ['walletContents', evmWalletAddress ?? '', solanaWallet ?? ''],
        queryFn: async () => {
            const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
            const response = await axiosClient.get(
                `${TOKENS_SERVER_URL}/api/towns-wallet?evmWalletAddress=${
                    evmWalletAddress ?? ''
                }&solanaWalletAddress=${solanaWallet?.address ?? ''}`,
            )
            return response.data
        },
        select: (data) => {
            const response = zTownsWalletResponse.safeParse(data)
            return response.success ? response.data : undefined
        },
    })

    return { data, isLoading }
}
