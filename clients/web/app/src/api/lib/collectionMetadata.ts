import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ContractMetadata, GetCollectionMetadataAcrossNetworksResponse } from '@token-worker/types'
import { ethers } from 'ethers'
import { z } from 'zod'
import { Address, useSupportedXChainIds } from 'use-towns-client'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'
import { TokenDataWithChainId, TokenType } from '@components/Tokens/types'
import { TokenEntitlement } from '@components/Tokens/TokenSelector/tokenSchemas'

export const queryKeyAcrossNetworks = 'tokenMetadataAcrossNetworks'
const singleTokenQueryKey = 'tokenMetadata'

const metadataForSingleNetworkSchema: z.ZodType<ContractMetadata> = z.object({
    address: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    symbol: z.string().optional().nullable(),
    tokenType: z.nativeEnum(TokenType),
    imageUrl: z.string().optional().nullable(),
})

const metadataAcrossNetworksSchema: z.ZodType<GetCollectionMetadataAcrossNetworksResponse[]> =
    z.array(
        z.object({
            chainId: z.number(),
            data: z.object({
                address: z.string().optional().nullable(),
                name: z.string().optional().nullable(),
                symbol: z.string().optional().nullable(),
                tokenType: z.nativeEnum(TokenType),
                imageUrl: z.string().optional().nullable(),
            }),
        }),
    )

async function getCollectionMetadataAcrossNetworks(
    address: string,
    supportedChainIds: number[],
): Promise<GetCollectionMetadataAcrossNetworksResponse[]> {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    // See token-worker README for more information
    const url = `${TOKENS_SERVER_URL}/api/getCollectionMetadataAcrossNetworks/alchemy?contractAddress=${address}&supportedChainIds=${joinSupportedChainIds(
        supportedChainIds,
    )}`
    const response = await axiosClient.get(url)
    const parseResult = metadataAcrossNetworksSchema.safeParse(response.data)

    if (!parseResult.success) {
        console.error(`Error parsing getCollectionMetadataAcrossNetworks:: ${parseResult.error}`)
        throw new Error(`Error parsing getCollectionMetadataAcrossNetworks:: ${parseResult.error}`)
    }

    return response.data
}

async function getCollectionMetadataForChainId(
    address: string,
    nftNetwork: number,
    supportedChainIds: number[],
): Promise<ContractMetadata> {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    // See token-worker README for more information
    const url = `${TOKENS_SERVER_URL}/api/getCollectionMetadata/alchemy/${nftNetwork}?contractAddress=${address}&supportedChainIds=${joinSupportedChainIds(
        supportedChainIds,
    )}`
    const response = await axiosClient.get(url)
    const parseResult = metadataForSingleNetworkSchema.safeParse(response.data)

    if (!parseResult.success) {
        console.error(`Error parsing getCollectionMetadataAcrossNetworks:: ${parseResult.error}`)
        throw new Error(`Error parsing getCollectionMetadataAcrossNetworks:: ${parseResult.error}`)
    }

    return response.data
}

const failedMetadataCalls = new Map<string, boolean>()

export function useTokenMetadataAcrossNetworks(tokenAddress: string) {
    const _address = tokenAddress.toLowerCase()
    // const queryClient = useQueryClient()
    const { data: supportedXChainIds } = useSupportedXChainIds()

    return useQuery({
        queryKey: [queryKeyAcrossNetworks, _address],
        queryFn: async (): Promise<TokenDataWithChainId[]> => {
            if (!supportedXChainIds) {
                return []
            }

            return mapTokensAcrossNetoworksToTokenProps(
                await getCollectionMetadataAcrossNetworks(_address, supportedXChainIds),
            )
        },
        retry: (failureCount, _error) => {
            if (failureCount > 3) {
                // some tokens are not NFTs and calls to NFT api will always fail
                // we don't want to keep retrying these calls, so if there's 3 retries that result in failure, turn off future calls for this address
                // note that the default retryDelay is an exponential backoff, so this won't trigger until after 5 seconds or so - maybe we want to adjust this?
                failedMetadataCalls.set(_address, true)
                return false
            }
            return true
        },
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 5,
        enabled:
            ethers.utils.isAddress(_address) &&
            Boolean(supportedXChainIds) &&
            !failedMetadataCalls.has(_address),
    })
}

function singleTokenQuerySetup(args: {
    tokenAddress: string
    chainId: number
    queryClient: ReturnType<typeof useQueryClient>
    supportedChainIds: number[] | undefined
}) {
    const { tokenAddress, chainId, queryClient } = args
    const _address = tokenAddress.toLowerCase()

    return {
        queryKey: [singleTokenQueryKey, _address],
        queryFn: async (): Promise<TokenDataWithChainId> => {
            if (!args.supportedChainIds) {
                throw new Error('supportedChainIds is required')
            }

            // check if the token has already been loaded from the across-networks query
            const cachedData: ReturnType<typeof useTokenMetadataAcrossNetworks>['data'] =
                queryClient.getQueryData([queryKeyAcrossNetworks, _address])

            if (cachedData) {
                const token = cachedData.find(
                    (t) => t.chainId === chainId && t.data.address.toLowerCase() === _address,
                )
                if (token) {
                    return token
                }
            }

            return mapToTokenData(
                await getCollectionMetadataForChainId(_address, chainId, args.supportedChainIds),
                chainId,
            )
        },
        retry: (failureCount: number, _error: Error) => {
            if (failureCount > 3) {
                // some tokens are not NFTs and calls to NFT api will always fail
                // we don't want to keep retrying these calls, so if there's 3 retries that result in failure, turn off future calls for this address
                // note that the default retryDelay is an exponential backoff, so this won't trigger until after 5 seconds or so - maybe we want to adjust this?
                failedMetadataCalls.set(_address, true)
                return false
            }
            return true
        },
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1_000 * 60 * 5,
        enabled:
            ethers.utils.isAddress(_address) &&
            !failedMetadataCalls.has(_address) &&
            Boolean(args.supportedChainIds),
    }
}

export function useTokenMetadataForChainId(tokenAddress: string, chainId: number) {
    const queryClient = useQueryClient()
    const { data: supportedXChainIds } = useSupportedXChainIds()

    return useQuery({
        ...singleTokenQuerySetup({
            tokenAddress,
            chainId,
            queryClient,
            supportedChainIds: supportedXChainIds,
        }),
    })
}

export function useMultipleTokenMetadatasForChainIds(tokens: TokenEntitlement[] | undefined) {
    const queryClient = useQueryClient()
    const { data: supportedXChainIds } = useSupportedXChainIds()

    return useQueries({
        queries: (tokens ?? []).map((token) => {
            const querySetup = singleTokenQuerySetup({
                tokenAddress: token.address,
                chainId: token.chainId,
                queryClient,
                supportedChainIds: supportedXChainIds,
            })
            return {
                ...querySetup,
                enabled: querySetup.enabled && tokens && tokens.length > 0,
            }
        }),
        combine: (results) => {
            return {
                data: results
                    .map((r) => r.data)
                    .filter((r): r is TokenDataWithChainId => r !== undefined),
                isError: results.some((r) => r.isError),
                isLoading: results.some((r) => r.isLoading),
            }
        },
    })
}

export function mapTokensAcrossNetoworksToTokenProps(
    tokens: GetCollectionMetadataAcrossNetworksResponse[],
): TokenDataWithChainId[] {
    return tokens.map((token) => {
        return mapToTokenData(token.data, token.chainId)
    })
}

export function mapToTokenData(token: ContractMetadata, chainId: number): TokenDataWithChainId {
    return {
        chainId,
        data: {
            imgSrc: token.imageUrl || '',
            label: token.name || '',
            address: (token.address || '') as Address,
            type: (token?.tokenType as TokenType) || undefined,
            quantity: undefined,
        },
    }
}

function joinSupportedChainIds(supportedChainIds: number[]) {
    return supportedChainIds.join(',')
}
