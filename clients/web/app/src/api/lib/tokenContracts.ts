import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractMetadata, ContractMetadataResponse } from '@token-worker/types'
import { TokenProps } from '@components/Tokens'
import { queryClient } from 'api/queryClient'
import { axiosClient } from '../apiClient'

const queryKey = 'tokenContractsForAddress'
const queryKeyAll = 'tokenContractsForAddressAll'

type CachedData = {
    previousPageKey?: string
    nextPageKey?: string
    tokens: TokenProps[]
}

type UseTokenContractsForAdress = {
    wallet: string
    zionTokenAddress: string | null
    enabled: boolean
    pageKey: string
    all: boolean
}

export function useTokenContractsForAddress({
    wallet,
    zionTokenAddress,
    enabled,
    pageKey,
    all = false,
}: UseTokenContractsForAdress) {
    return useQuery(
        [queryKey, pageKey],
        () => getTokenContractsForAddress(wallet, zionTokenAddress, pageKey, all),
        {
            onSuccess: (data) => {
                const cached = getCachedTokensForWallet()
                queryClient.setQueryData<CachedData>([queryKeyAll], {
                    previousPageKey: cached.nextPageKey,
                    nextPageKey: data.nextPageKey,
                    tokens: [...cached.tokens, ...data.tokens],
                })
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            keepPreviousData: true,
            enabled,
        },
    )
}

export function getCachedTokensForWallet(): CachedData {
    const cached = queryClient.getQueryData<CachedData>([queryKeyAll])
    return cached || { nextPageKey: '', previousPageKey: '', tokens: [] }
}

function mapToTokenProps(token: ContractMetadata): TokenProps {
    return {
        imgSrc: token.imageUrl || '',
        label: token.name || '',
        contractAddress: token.address || '',
    }
}

const zContractData: z.ZodType<ContractMetadata> = z.object({
    address: z.string().optional(),
    name: z.string().optional(),
    symbol: z.string().optional(),
    tokenType: z.string().optional(),
    imageUrl: z.string().optional(),
})

const zSchema: z.ZodType<ContractMetadataResponse> = z.object({
    blockHash: z.string(),
    totalCount: z.number(),
    pageKey: z.string().optional(),
    ownedNftsContract: z.array(zContractData),
})

async function getTokenContractsForAddress(
    wallet: string,
    zionTokenAddress: string | null,
    pageKey = '',
    all = false,
) {
    const TOKENS_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getNftsForOwner/eth-mainnet/${wallet}?contractMetadata&pageKey=${pageKey}${
        all ? '&all' : ''
    }`
    const response = await axiosClient.get(url)
    const parseResult = zSchema.safeParse(response.data)

    if (!parseResult.success) {
        throw new Error(`Error parsing ContractMetadataResponse:: ${parseResult.error}`)
    }

    let tokens = parseResult.data.ownedNftsContract.map(mapToTokenProps)
    const nextPageKey = parseResult.data.pageKey

    // TBD: are we adding zion token to list of tokens for everyone?
    if (zionTokenAddress) {
        const zionData: TokenProps = {
            imgSrc: 'https://picsum.photos/id/99/400',
            label: 'Zion',
            contractAddress: zionTokenAddress,
        }

        tokens = [zionData, ...tokens]
    }
    return { tokens, nextPageKey }
}
