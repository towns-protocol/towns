import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractMetadata, GetNftsResponse } from '@token-worker/types'
import { erc20ABI } from 'wagmi'
import { ethers } from 'ethers'
import { useMemo } from 'react'
import { TokenProps } from '@components/Tokens/types'
import { env } from 'utils'
import {
    fetchGoerli,
    fetchVitalikTokens,
    useAlchemyNetworkForNFTAPI,
} from 'hooks/useAlchemyNetwork'
import { axiosClient } from '../apiClient'

const queryKey = 'tokenContractsForAddress'
const queryKeyPaginatedAggregation = 'tokenContractsForAddressAll'

type CachedData = {
    previousPageKey?: string
    nextPageKey?: string
    tokens: TokenProps[]
}

type UseTokenContractsForAdress = {
    wallet: string
    zionTokenAddress: string | null
    enabled: boolean
    pageKey?: string
    all: boolean
    chainId: number | undefined
}

const zContractData: z.ZodType<ContractMetadata> = z.object({
    address: z.string().optional(),
    name: z.string().optional(),
    symbol: z.string().optional(),
    tokenType: z.string().optional(),
    imageUrl: z.string().optional(),
})

const zSchema: z.ZodType<GetNftsResponse> = z.object({
    blockHash: z.string(),
    totalCount: z.number(),
    pageKey: z.string().optional(),
    ownedNftsContract: z.array(zContractData),
})

// Get the tokens in a user's wallet
// If the `all` flag is set, it will return all tokens, otherwise it will return a paginated list
export function useTokenContractsForAddress({
    wallet,
    zionTokenAddress,
    enabled,
    pageKey,
    all = false,
    chainId,
}: UseTokenContractsForAdress) {
    const queryClient = useQueryClient()
    const _queryKey = useMemo(() => (all ? [queryKey] : [queryKey, pageKey]), [all, pageKey])
    const alchmeyNetwork = useAlchemyNetworkForNFTAPI()
    return useQuery(
        _queryKey,
        () =>
            chainId === 31337
                ? getLocalHostTokens(wallet, zionTokenAddress, pageKey, all, alchmeyNetwork)
                : getTokenContractsForAddress(
                      wallet,
                      zionTokenAddress,
                      pageKey,
                      all,
                      alchmeyNetwork,
                  ),
        {
            onSuccess: (data) => {
                if (!all) {
                    queryClient.setQueryData<CachedData>(
                        [queryKeyPaginatedAggregation],
                        (prevState) => ({
                            previousPageKey: prevState?.nextPageKey,
                            nextPageKey: data.nextPageKey,
                            tokens: [...(prevState?.tokens || []), ...data.tokens],
                        }),
                    )
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            keepPreviousData: true,
            enabled,
        },
    )
}

// Grab the tokens from the existing query
// If the useTokenContractsForAddress() hook was called as a paginated list, the `fromPaginatedAggregation` will return an aggregated list of all tokens from each paginated query
export function useCachedTokensForWallet(fromPaginatedAggregation = false) {
    const queryClient = useQueryClient()

    return useMemo(() => {
        const cached = fromPaginatedAggregation
            ? queryClient.getQueryData<CachedData>([queryKeyPaginatedAggregation])
            : queryClient.getQueryData<CachedData>([queryKey])
        return cached || { nextPageKey: '', previousPageKey: '', tokens: [] }
    }, [fromPaginatedAggregation, queryClient])
}

async function getLocalHostTokens(
    wallet: string,
    zionTokenAddress: string | null,
    pageKey = '',
    all = false,
    alchmeyNetwork: string,
) {
    // to test with a big list of tokens, add ?vitalikTokens to the url, or ?goerli to use the goerli testnet
    if (fetchVitalikTokens || fetchGoerli) {
        return getTokenContractsForAddress(wallet, zionTokenAddress, pageKey, all, alchmeyNetwork)
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
    pageKey = '',
    all = false,
    alchmeyNetwork: string,
) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getNftsForOwner/${alchmeyNetwork}/${wallet}?contractMetadata&pageKey=${pageKey}${
        all ? '&all' : ''
    }`
    const response = await axiosClient.get(url)
    const parseResult = zSchema.safeParse(response.data)

    if (!parseResult.success) {
        throw new Error(`Error parsing ContractMetadataResponse:: ${parseResult.error}`)
    }

    const tokens = parseResult.data.ownedNftsContract.map(mapToTokenProps)
    const nextPageKey = parseResult.data.pageKey

    return { tokens, nextPageKey }
}

function mapToTokenProps(token: ContractMetadata): TokenProps {
    return {
        imgSrc: token.imageUrl || '',
        label: token.name || '',
        contractAddress: token.address || '',
    }
}

function mapZionTokenToTokenProps(zionTokenAddress: string) {
    return {
        imgSrc: 'https://picsum.photos/id/99/400',
        label: 'Zion',
        contractAddress: zionTokenAddress,
    }
}

async function getLocalZionTokenBalance(zionTokenAddress: string, wallet: string) {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    const contract = new ethers.Contract(zionTokenAddress, erc20ABI, provider)
    const balance = await contract.balanceOf(wallet)
    return balance.toNumber()
}
