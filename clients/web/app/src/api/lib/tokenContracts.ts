import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractMetadata, ContractMetadataResponse } from '@token-worker/types'
import { erc20ABI } from '@wagmi/core'
import { ethers } from 'ethers'
import { TokenProps } from '@components/Tokens'
import { queryClient } from 'api/queryClient'
import { hasVitalkTokensParam, isDev } from 'utils'
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
    return useQuery(
        [queryKey, pageKey],
        () =>
            chainId === 31337
                ? getTokenContractsForAddress(wallet, zionTokenAddress, pageKey, all)
                : // once zion token is airdropped remove this
                  getGoerliTokenContractsForAddress(wallet, zionTokenAddress, pageKey, all),
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

async function getGoerliTokenContractsForAddress(
    _wallet: string,
    zionTokenAddress: string | null,
    _pageKey = '',
    _all = false,
) {
    let tokens: TokenProps[] = []
    if (zionTokenAddress) {
        const zionData: TokenProps = {
            imgSrc: 'https://picsum.photos/id/99/400',
            label: 'Zion',
            contractAddress: zionTokenAddress,
        }

        tokens = [zionData]
    }
    return { tokens, nextPageKey: undefined }
}

const GOERLI = 'eth-goerli'
const MAINNET = 'eth-mainnet'
const fetchVitalikTokens = hasVitalkTokensParam()
const NETWORK = fetchVitalikTokens ? MAINNET : GOERLI

async function getTokenContractsForAddress(
    wallet: string,
    zionTokenAddress: string | null,
    pageKey = '',
    all = false,
) {
    // on local, just return the zion token, if it exists (must be anvil account)
    if (isDev && zionTokenAddress && !fetchVitalikTokens) {
        const tokens = []
        const balance = await getLocalZionTokenBalance(zionTokenAddress, wallet)
        if (balance > 0) tokens.push(mapZionTokenToTokenProps(zionTokenAddress))
        return {
            tokens,
            nextPageKey: undefined,
        }
    }

    const TOKENS_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getNftsForOwner/${NETWORK}/${wallet}?contractMetadata&pageKey=${pageKey}${
        all ? '&all' : ''
    }`
    const response = await axiosClient.get(url)
    const parseResult = zSchema.safeParse(response.data)

    if (!parseResult.success) {
        throw new Error(`Error parsing ContractMetadataResponse:: ${parseResult.error}`)
    }

    let tokens = parseResult.data.ownedNftsContract.map(mapToTokenProps)
    const nextPageKey = parseResult.data.pageKey

    // zion token should come from the NFT query, but it's not airdropped yet
    // once it's airdropped we can remove this
    if (zionTokenAddress) {
        tokens = [mapZionTokenToTokenProps(zionTokenAddress), ...tokens]
    }
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
