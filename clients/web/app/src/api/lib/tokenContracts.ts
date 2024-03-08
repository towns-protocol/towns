import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractMetadata, GetCollectionsForOwnerResponse } from '@token-worker/types'
import { Address } from 'wagmi'
import { useMemo } from 'react'
import { TokenProps, TokenType } from '@components/Tokens/types'
import { env } from 'utils'
import {
    fetchBaseSepolia,
    fetchMainnetTokens,
    mainnetTokenAddress,
    useNetworkForNftApi,
} from 'hooks/useNetworkForNftApi'
import { getTokenType } from '@components/Web3/checkTokenType'
import { useAuth } from 'hooks/useAuth'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { axiosClient } from '../apiClient'

export const queryKey = 'tokenContractsForAddress'

type CachedData = {
    previousPageKey?: string
    nextPageKey?: string
    tokens: TokenProps[]
}

type UseTokenContractsForAdress = {
    wallet: string
    enabled: boolean
    chainId: number | undefined
}

const zContractData: z.ZodType<ContractMetadata> = z.object({
    address: z.string().optional(),
    name: z.string().optional(),
    symbol: z.string().optional(),
    tokenType: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
})

const zSchema: z.ZodType<GetCollectionsForOwnerResponse> = z.object({
    totalCount: z.number(),
    pageKey: z.string().optional(),
    collections: z.array(zContractData),
})

// Get the tokens in a user's wallet
export function useCollectionsForOwner({ wallet, enabled, chainId }: UseTokenContractsForAdress) {
    const nftNetwork = useNetworkForNftApi()

    return useQuery({
        queryKey: [queryKey],

        queryFn: () =>
            chainId === 31337
                ? getLocalHostTokens(wallet, nftNetwork)
                : getTokenContractsForAddress(wallet, nftNetwork),

        staleTime: 1000 * 15,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled,
    })
}

export function useCollectionsForLoggedInUser() {
    // TODO: this should probably be all linked wallets
    // and use useQueries to get all the tokens for all the wallets
    const { loggedInWalletAddress } = useAuth()
    const { chainId } = useEnvironment()

    return useCollectionsForOwner({
        wallet:
            (fetchMainnetTokens && mainnetTokenAddress
                ? mainnetTokenAddress
                : loggedInWalletAddress) ?? '',
        enabled: Boolean(chainId),
        chainId,
    })
}

// Grab the tokens from the existing query
export function useCachedTokensForWallet() {
    const queryClient = useQueryClient()

    return useMemo(() => {
        const cached = queryClient.getQueryData<CachedData>([queryKey])
        return cached || { nextPageKey: '', previousPageKey: '', tokens: [] }
    }, [queryClient])
}

async function getLocalHostTokens(wallet: string, nftNetwork: number) {
    // to test with a big list of tokens, add ?mainnet to the url, or ?base_sepolia to use the base_sepolia testnet
    if (fetchMainnetTokens || fetchBaseSepolia) {
        return getTokenContractsForAddress(wallet, nftNetwork)
    }

    // on local, just return the towns token, if it exists (must be anvil account)
    const tokens: TokenProps[] = []
    return {
        tokens,
        nextPageKey: undefined,
    }
}

async function getTokenContractsForAddress(wallet: string, nftNetwork: number) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    // See token-worker README for more information
    const url = `${TOKENS_SERVER_URL}/api/getCollectionsForOwner/alchemy/${nftNetwork}/${wallet}`
    const response = await axiosClient.get(url)
    const parseResult = zSchema.safeParse(response.data)

    if (!parseResult.success) {
        console.error(`Error parsing ContractMetadataResponse:: ${parseResult.error}`)
        throw new Error(`Error parsing ContractMetadataResponse:: ${parseResult.error}`)
    }

    const tokens = await Promise.all(parseResult.data.collections.map(mapToTokenProps))
    const nextPageKey = parseResult.data.pageKey

    return { tokens, nextPageKey }
}

export async function mapToTokenProps(token: ContractMetadata): Promise<TokenProps> {
    let type: TokenType | undefined
    try {
        type = token.address ? await getTokenType({ address: token.address as Address }) : undefined
    } catch (error) {
        console.error(`Error getting token type for ${token.address}`, error)
    }

    return {
        imgSrc: token.imageUrl || '',
        label: token.name || '',
        contractAddress: token.address || '',
        type,
    }
}
