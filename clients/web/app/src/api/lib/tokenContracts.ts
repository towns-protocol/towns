import { useQueries, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
    ContractMetadata,
    GetCollectionsForOwnerAcrossNetworksResponse,
    GetCollectionsForOwnerResponse,
    GetNftMetadataResponse,
    GetNftOwnersResponse,
    NftDisplayNft,
    NftImageMetadata,
} from '@token-worker/types'
import { Address, queryClient, useSupportedXChainIds } from 'use-towns-client'
import { ethers } from 'ethers'
import { TokenData, TokenDataWithChainId, TokenType } from '@components/Tokens/types'
import { env } from 'utils'
import { axiosClient } from '../apiClient'

export const queryKey = 'tokenContractsForAddress'

function tokenContractsForAddressQueryKey(wallet: string) {
    return [queryKey, wallet]
}

const zNftImageMetadata: z.ZodType<NftImageMetadata> = z.object({
    cachedUrl: z.string().optional().nullable(),
    thumbnailUrl: z.string().optional().nullable(),
})

const zDisplayNft: z.ZodType<NftDisplayNft> = z.object({
    tokenId: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
})

const zContractData: z.ZodType<ContractMetadata> = z.object({
    address: z.string().optional(),
    name: z.string().optional().nullable(),
    symbol: z.string().optional().nullable(),
    tokenType: z.nativeEnum(TokenType).optional(),
    imageUrl: z.string().optional().nullable(),
    displayNft: zDisplayNft.optional().nullable(),
    image: zNftImageMetadata.optional().nullable(),
    openSeaCollectionUrl: z.string().optional().nullable(),
})

const zSchema: z.ZodType<GetCollectionsForOwnerResponse> = z.object({
    totalCount: z.number(),
    pageKey: z.nativeEnum(TokenType).optional(),
    collections: z.array(zContractData),
})

const zCrossNetworksData: z.ZodType<GetCollectionsForOwnerAcrossNetworksResponse> = z.object({
    chainId: z.number(),
    status: z.enum(['success', 'error']),
    data: zSchema,
})

const zNftMetadata: z.ZodType<GetNftMetadataResponse & GetNftOwnersResponse> = z.object({
    owners: z.array(z.string()),
    media: z.array(
        z.object({
            thumbnail: z.string().or(z.undefined()),
            gateway: z.string(),
            format: z.string().or(z.undefined()),
            bytes: z.number().or(z.undefined()),
        }),
    ),
    metadata: z.object({ image: z.string().nullable().optional() }),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
})

export function useCollectionsForAddressesAcrossNetworks({
    wallets,
    enabled = true,
}: {
    wallets: string[]
    enabled: boolean
}) {
    const { data: supportedXChainIds } = useSupportedXChainIds()

    const queries = wallets.map((wallet) => {
        return {
            queryKey: tokenContractsForAddressQueryKey(wallet),
            queryFn: () => {
                if (!supportedXChainIds) {
                    return []
                }
                return getTokenContractsForAddressAcrossNetworks(wallet, supportedXChainIds)
            },
            enabled: enabled && ethers.utils.isAddress(wallet) && Boolean(supportedXChainIds),
            staleTime: 15_000,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        }
    })
    const responses = useQueries({ queries })
    const isFetching = responses.some((response) => response.isLoading)
    const data = responses.flatMap((r) => r.data).flatMap((r) => r)
    return { data, isFetching }
}

export function getCollectionsForAddressQueryData(
    wallet: string,
): TokenDataWithChainId[] | undefined {
    return queryClient.getQueryData(tokenContractsForAddressQueryKey(wallet))
}

export function invalidateCollectionsForAddressQueryData(wallet: string) {
    return queryClient.invalidateQueries({ queryKey: tokenContractsForAddressQueryKey(wallet) })
}

export function useNftMetadata(
    info:
        | {
              chainId: number
              tokenId: string
              contractAddress: string
          }
        | undefined,
) {
    const { data: supportedChainIds } = useSupportedXChainIds()
    return useQuery({
        queryKey: ['getNftMetadata', info?.contractAddress],
        queryFn: () => {
            if (!info || !supportedChainIds) {
                return
            }
            return getNftMetadata(
                info?.chainId ?? 0,
                info?.tokenId ?? '',
                info?.contractAddress ?? '',
                supportedChainIds,
            )
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!info && !!supportedChainIds,
    })
}

async function getNftMetadata(
    chainId: number,
    tokenId: string,
    contractAddress: string,
    supportedChainIds: number[],
) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getNftMetadata/?chainId=${chainId}&tokenId=${tokenId}&contractAddress=${contractAddress}&supportedChainIds=${joinSupportedChainIds(
        supportedChainIds,
    )}`
    const response = await axiosClient.get(url)
    const parseResult = zNftMetadata.safeParse(response.data)

    if (!parseResult.success) {
        console.error(`Error parsing nft metadata response:: ${parseResult.error}`)
        throw new Error(`Error parsing nft metadata response:: ${parseResult.error}`)
    }
    return parseResult
}

export async function mapToTokenProps(token: ContractMetadata): Promise<TokenData> {
    return {
        imgSrc: token.imageUrl || '',
        label: token.name || '',
        address: (token.address || '') as Address,
        type: (token.tokenType as TokenType) || TokenType.UNKNOWN,
        quantity: undefined,
        image: token.image ?? undefined,
        openSeaCollectionUrl: token.openSeaCollectionUrl ?? undefined,
    }
}

async function getTokenContractsForAddressAcrossNetworks(
    wallet: string,
    supportedChainIds: number[],
) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    // See token-worker README for more information
    const url = `${TOKENS_SERVER_URL}/api/getCollectionsForOwnerAcrossNetworks/alchemy/${wallet}?supportedChainIds=${joinSupportedChainIds(
        supportedChainIds,
    )}`
    const response = await axiosClient.get(url)
    const parseResult = z.array(zCrossNetworksData).safeParse(response.data)

    if (!parseResult.success) {
        console.error(`Error parsing cross networks response:: ${parseResult.error}`)
        throw new Error(`Error parsing cross networks response:: ${parseResult.error}`)
    }

    return await Promise.all(
        parseResult.data.flatMap((d) => {
            if (!d.data) {
                return undefined
            }
            return d.data.collections.map((e) => mapToTokenPropsWithChainId(d.chainId, e))
        }),
    )
}

export async function mapToTokenPropsWithChainId(
    chainId: number,
    token: ContractMetadata,
): Promise<TokenDataWithChainId> {
    return {
        chainId: chainId,
        data: {
            imgSrc: '',
            label: token.name || '',
            address: (token.address || '') as Address,
            type: (token.tokenType as TokenType) || TokenType.UNKNOWN,
            openSeaCollectionUrl: token.openSeaCollectionUrl ?? undefined,
            quantity: undefined,
            image: token.image ?? undefined,
            displayNft: token.displayNft ?? undefined,
        },
    }
}

function joinSupportedChainIds(supportedChainIds: number[]) {
    return supportedChainIds.join(',')
}
