import { mainnet, arbitrum, optimism, base, baseSepolia, polygon } from 'viem/chains'
import {
    ContractMetadata,
    GetContractMetadataAlchemyResponse,
    GetContractsForOwnerAlchemyResponse,
    GetNftMetadataResponse,
    GetTokenMetadataAlchemyResponse,
} from './types'
import { throwCustomError } from './router'
import { createPublicClient, http } from 'viem'
import { GetOwnersForNftResponse } from 'alchemy-sdk'

export const tokenNetworkMap = [
    {
        vChain: mainnet,
        alchemyIdentifier: 'eth-mainnet',
        coinGeckoIdentifier: 'eth',
    },
    {
        vChain: arbitrum,
        alchemyIdentifier: 'arb-mainnet',
        coinGeckoIdentifier: 'arbitrum',
    },
    {
        vChain: optimism,
        alchemyIdentifier: 'opt-mainnet',
        coinGeckoIdentifier: 'optimism',
    },
    {
        vChain: polygon,
        alchemyIdentifier: 'polygon-mainnet',
        coinGeckoIdentifier: 'matic-network',
    },
    {
        vChain: base,
        alchemyIdentifier: 'base-mainnet',
        coinGeckoIdentifier: 'base',
    },
    {
        vChain: baseSepolia,
        alchemyIdentifier: 'base-sepolia',
        coinGeckoIdentifier: '',
    },
] as const

export function supportedTokenNetworkMap(supportedChains: number[]) {
    return tokenNetworkMap.filter((n) => supportedChains.includes(n.vChain.id))
}

function getChainFromChainId(supportedChains: number[], id: number) {
    const chain = supportedTokenNetworkMap(supportedChains).find((n) => n.vChain.id === id)
    if (!chain) {
        throw new Error(`invalid chainId:: ${id}`)
    }
    return chain
}

export function generateAlchemyNftUrl(chainIds: number[], targetChainId: number, apiKey: string) {
    const chain = getChainFromChainId(chainIds, targetChainId)
    return `https://${chain.alchemyIdentifier}.g.alchemy.com/nft/v3/${apiKey}`
}

export function generateAlchemyRpcUrl(chainIds: number[], targetChainId: number, apiKey: string) {
    const chain = getChainFromChainId(chainIds, targetChainId)
    return `https://${chain.alchemyIdentifier}.g.alchemy.com/v2/${apiKey}`
}

export async function fetchAlchemyTokenMetadata(
    chainIds: number[],
    targetChainId: number,
    apiKey: string,
    tokenAddress: string,
): Promise<GetTokenMetadataAlchemyResponse> {
    const rpcUrl = generateAlchemyRpcUrl(chainIds, targetChainId, apiKey)
    const fetchOptions = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'alchemy_getTokenMetadata',
            params: [tokenAddress],
        }),
    }

    try {
        const response = await fetch(rpcUrl, fetchOptions)
        if (!response.ok) {
            throwCustomError(
                (await response.text()) || 'could not fetch token metadata from Alchemy',
                response.status,
            )
        }
        const responseData = (await response.json()) as { result?: GetTokenMetadataAlchemyResponse }
        if (responseData.result === undefined) {
            throw new Error('Invalid response structure from Alchemy')
        }
        return responseData.result
    } catch (error) {
        if (error instanceof Error) {
            throw throwCustomError(error.message, (error as { code?: number })?.code || 500)
        } else {
            throw throwCustomError('An unknown error occurred', 500)
        }
    }
}

export function withOpenSeaImage(
    contracts: GetContractsForOwnerAlchemyResponse['contracts'],
): GetContractsForOwnerAlchemyResponse['contracts'] {
    return contracts.map((contract) => {
        // TODO: need to update alchemy sdk to get proper types
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { openSeaMetadata, ...rest } = contract

        return {
            ...rest,
            imageUrl: openSeaMetadata?.imageUrl,
        }
    })
}

export const fetchAlchemyNfts = async (
    rpcUrl: string,
    wallet: string,
    pageKey: string,
): Promise<GetContractsForOwnerAlchemyResponse> => {
    let url = `${rpcUrl}/getContractsForOwner?owner=${wallet}&withMetadata=true`

    if (pageKey) {
        url = url.concat(`&pageKey=${pageKey}`)
    }

    // alchemy updated so spam filter is only available for paid levels
    // And if you try to add the filters w/out paid, it errors!
    // if (rpcUrl.includes('eth-mainnet')) {
    //     url = url.concat('&includeFilters[]=SPAM')
    // }

    try {
        const response = await fetch(url)
        if (!response.ok) {
            throwCustomError(
                (await response.text?.()) || 'could not fetch from alchemy',
                response.status,
            )
        }

        return (await response.json()) as GetContractsForOwnerAlchemyResponse
    } catch (error) {
        throw throwCustomError(JSON.stringify(error), (error as unknown as { code: number })?.code)
    }
}

export const fetchAlchemyContractMetadata = async (
    rpcUrl: string,
    contractAddress: string,
): Promise<GetContractMetadataAlchemyResponse> => {
    const response = await fetch(`${rpcUrl}/getContractMetadata?contractAddress=${contractAddress}`)
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return (await response.json()) as GetContractMetadataAlchemyResponse
}

export const fetchAlchemyNftOwners = async (
    rpcUrl: string,
    contractAddress: string,
    tokenId: string,
): Promise<GetOwnersForNftResponse> => {
    const url = `${rpcUrl}/getOwnersForNFT?contractAddress=${contractAddress}&tokenId=${tokenId}`
    const response = await fetch(url)
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return (await response.json()) as GetOwnersForNftResponse
}

export const fetchAlchemyNftMetadata = async (
    rpcUrl: string,
    contractAddress: string,
    tokenId: string,
): Promise<GetNftMetadataResponse> => {
    const url = `${rpcUrl}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`
    const response = await fetch(url)
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return (await response.json()) as GetNftMetadataResponse
}

export function toContractMetadata(response: GetContractMetadataAlchemyResponse): ContractMetadata {
    return {
        address: response.address,
        name: response.name,
        symbol: response.symbol,
        tokenType: response.tokenType,
        imageUrl: response.openSeaMetadata?.imageUrl,
        openSeaCollectionUrl: response.openSeaMetadata?.collectionSlug
            ? `https://opensea.io/collection/${response.openSeaMetadata?.collectionSlug}`
            : undefined,
    }
}

export function generatePublicClients(supportedChainIds: number[], alchemyApiKey: string) {
    return supportedTokenNetworkMap(supportedChainIds).map((n) => {
        return createPublicClient({
            chain: n.vChain,
            transport: http(generateAlchemyRpcUrl(supportedChainIds, n.vChain.id, alchemyApiKey)),
            pollingInterval: 2_000,
        })
    })
}

export function mapSupportedChainIds(chainIds: string | undefined) {
    if (!chainIds) {
        throw new Error('missing supportedChainIds')
    }
    return chainIds.split(',').map((id) => +id)
}
