import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractMetadata, GetCollectionsForOwnerResponse } from '@token-worker/types'
import { Address, erc20ABI } from 'wagmi'
import { ethers } from 'ethers'
import { useMemo } from 'react'
import { TokenProps, TokenType } from '@components/Tokens/types'
import { env } from 'utils'
import { fetchGoerli, fetchVitalikTokens, useNetworkForNftApi } from 'hooks/useNetworkForNftApi'
import { getTokenType } from '@components/Web3/checkTokenType'
import { axiosClient } from '../apiClient'

const queryKey = 'tokenContractsForAddress'

type CachedData = {
    previousPageKey?: string
    nextPageKey?: string
    tokens: TokenProps[]
}

type UseTokenContractsForAdress = {
    wallet: string
    zionTokenAddress: string | null
    enabled: boolean
    chainId: number | undefined
}

const zContractData: z.ZodType<ContractMetadata> = z.object({
    address: z.string().optional(),
    name: z.string().optional(),
    symbol: z.string().optional(),
    tokenType: z.string().optional(),
    imageUrl: z.string().optional(),
})

const zSchema: z.ZodType<GetCollectionsForOwnerResponse> = z.object({
    totalCount: z.number(),
    pageKey: z.string().optional(),
    collections: z.array(zContractData),
})

// Get the tokens in a user's wallet
export function useCollectionsForOwner({
    wallet,
    zionTokenAddress,
    enabled,
    chainId,
}: UseTokenContractsForAdress) {
    const alchmeyNetwork = useNetworkForNftApi()

    return useQuery(
        [queryKey],
        () =>
            chainId === 31337
                ? getLocalHostTokens(wallet, zionTokenAddress, alchmeyNetwork)
                : getTokenContractsForAddress(wallet, zionTokenAddress, alchmeyNetwork),
        {
            staleTime: 1000 * 15,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            keepPreviousData: true,
            enabled,
        },
    )
}

// Grab the tokens from the existing query
export function useCachedTokensForWallet() {
    const queryClient = useQueryClient()

    return useMemo(() => {
        const cached = queryClient.getQueryData<CachedData>([queryKey])
        return cached || { nextPageKey: '', previousPageKey: '', tokens: [] }
    }, [queryClient])
}

async function getLocalHostTokens(
    wallet: string,
    zionTokenAddress: string | null,
    alchmeyNetwork: string,
) {
    // to test with a big list of tokens, add ?vitalikTokens to the url, or ?goerli to use the goerli testnet
    if (fetchVitalikTokens || fetchGoerli) {
        return getTokenContractsForAddress(wallet, zionTokenAddress, alchmeyNetwork)
    }

    // on local, just return the zion token, if it exists (must be anvil account)
    const tokens: TokenProps[] = []
    if (zionTokenAddress) {
        const balance = await getLocalZionTokenBalance(zionTokenAddress, wallet)
        if (balance > 0) {
            tokens.push(mapZionTokenToTokenProps(zionTokenAddress))
        }
    }
    return {
        tokens,
        nextPageKey: undefined,
    }
}

async function getTokenContractsForAddress(
    wallet: string,
    _zionTokenAddress: string | null,
    alchmeyNetwork: string,
) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getCollectionsForOwner/in/${alchmeyNetwork}/${wallet}`
    const response = await axiosClient.get(url)
    const parseResult = zSchema.safeParse(response.data)

    if (!parseResult.success) {
        throw new Error(`Error parsing ContractMetadataResponse:: ${parseResult.error}`)
    }

    const tokens = await Promise.all(parseResult.data.collections.map(mapToTokenProps))
    const nextPageKey = parseResult.data.pageKey

    return { tokens, nextPageKey }
}

async function mapToTokenProps(token: ContractMetadata): Promise<TokenProps> {
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

function mapZionTokenToTokenProps(zionTokenAddress: string) {
    return {
        imgSrc: 'https://picsum.photos/id/99/400',
        label: 'Zion',
        contractAddress: zionTokenAddress,
        type: undefined,
    }
}

async function getLocalZionTokenBalance(zionTokenAddress: string, wallet: string) {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    const contract = new ethers.Contract(zionTokenAddress, erc20ABI, provider)
    const balance = await contract.balanceOf(wallet)
    return balance.toNumber()
}
