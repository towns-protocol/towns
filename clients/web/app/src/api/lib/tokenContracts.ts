import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractMetadata, ContractMetadataResponse } from '@token-worker/types'
import { erc20ABI } from '@wagmi/core'
import { ethers } from 'ethers'
import { useMemo } from 'react'
import { TokenProps } from '@components/Tokens/types'
import { env, hasVitalkTokensParam } from 'utils'
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
    chainId: number | undefined
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

export function useTokenContractsForAddress({
    wallet,
    zionTokenAddress,
    enabled,
    pageKey,
    all = false,
    chainId,
}: UseTokenContractsForAdress) {
    const queryClient = useQueryClient()
    const cachedTokensForWallet = useCachedTokensForWallet()
    return useQuery(
        [queryKey, pageKey, cachedTokensForWallet],
        () =>
            chainId === 31337
                ? getLocalHostTokens(wallet, zionTokenAddress, pageKey, all)
                : getTokenContractsForAddress(wallet, zionTokenAddress, pageKey, all),
        {
            onSuccess: (data) => {
                queryClient.setQueryData<CachedData>([queryKeyAll], {
                    previousPageKey: cachedTokensForWallet.nextPageKey,
                    nextPageKey: data.nextPageKey,
                    tokens: [...cachedTokensForWallet.tokens, ...data.tokens],
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

export function useCachedTokensForWallet() {
    const queryClient = useQueryClient()

    return useMemo(() => {
        const cached = queryClient.getQueryData<CachedData>([queryKeyAll])
        return cached || { nextPageKey: '', previousPageKey: '', tokens: [] }
    }, [queryClient])
}

const fetchVitalikTokens = hasVitalkTokensParam()

async function getLocalHostTokens(
    wallet: string,
    zionTokenAddress: string | null,
    pageKey = '',
    all = false,
) {
    // to test with a big list of tokens, add ?vitalikTokens to the url
    if (env.IS_DEV && fetchVitalikTokens) {
        return getTokenContractsForAddress(wallet, zionTokenAddress, pageKey, all)
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

const GOERLI = 'eth-goerli'
const NETWORK = GOERLI

async function getTokenContractsForAddress(
    wallet: string,
    _zionTokenAddress: string | null,
    pageKey = '',
    all = false,
) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getNftsForOwner/${NETWORK}/${wallet}?contractMetadata&pageKey=${pageKey}${
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
