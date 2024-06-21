import { mainnet, arbitrum, optimism, base, baseSepolia, polygon } from 'viem/chains'
import {
    ContractMetadata,
    GetContractMetadataAlchemyResponse,
    GetContractsForOwnerAlchemyResponse,
    GetNftMetadataResponse,
    SimpleHashCollectionsResponse,
} from './types'
import { throwCustomError } from './router'
import { createPublicClient, http } from 'viem'
import { GetOwnersForNftResponse } from 'alchemy-sdk'

const nftNetworkMap = [
    { vChain: mainnet, alchemyIdentifier: 'eth-mainnet', simpleHashIdentifier: 'ethereum' },
    { vChain: arbitrum, alchemyIdentifier: 'arb-mainnet', simpleHashIdentifier: 'arbitrum' },
    { vChain: optimism, alchemyIdentifier: 'opt-mainnet', simpleHashIdentifier: 'optimism' },
    { vChain: polygon, alchemyIdentifier: 'polygon-mainnet', simpleHashIdentifier: 'polygon' },
    { vChain: base, alchemyIdentifier: 'base-mainnet', simpleHashIdentifier: 'base' },
    {
        vChain: baseSepolia,
        alchemyIdentifier: 'base-sepolia',
        simpleHashIdentifier: 'base-sepolia',
    },
] as const

export function supportedNftNetworkMap(supportedChains: number[]) {
    return nftNetworkMap.filter((n) => supportedChains.includes(n.vChain.id))
}

function getChainFromChainId(supportedChains: number[], id: number) {
    return supportedNftNetworkMap(supportedChains).find((n) => n.vChain.id === id)
}

export function generateAlchemyNftUrl(chainIds: number[], targetId: number, apiKey: string) {
    const chain = getChainFromChainId(chainIds, targetId)
    if (!chain) {
        throw new Error(`invalid chainId:: ${targetId}`)
    }
    return `https://${chain.alchemyIdentifier}.g.alchemy.com/nft/v3/${apiKey}`
}

export function generateAlchemyRpcUrl(chainIds: number[], targetId: number, apiKey: string) {
    const chain = getChainFromChainId(chainIds, targetId)
    if (!chain) {
        throw new Error(`invalid chainId:: ${targetId}`)
    }
    return `https://${chain.alchemyIdentifier}.g.alchemy.com/v2/${apiKey}`
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
    }
}

// TODO: remove simplehash dependency https://linear.app/hnt-labs/issue/HNT-7233/remove-simplehash-in-token-worker-once-alchemy-supports-other-networks
export async function withSimpleHashImage({
    contractMetadata,
    chainId,
    simpleHashApiKey,
}: {
    simpleHashApiKey: string
    contractMetadata: ContractMetadata
    chainId: number
}): Promise<ContractMetadata> {
    if (contractMetadata.imageUrl) {
        return contractMetadata
    }
    const simpleHashIdentifier = nftNetworkMap.find(
        (x) => x.vChain.id === chainId,
    )?.simpleHashIdentifier

    if (!simpleHashIdentifier) {
        return contractMetadata
    }

    const url = `https://api.simplehash.com/api/v0/nfts/collections/${simpleHashIdentifier}/${contractMetadata.address}`

    try {
        const response = await fetch(url, {
            headers: {
                'X-API-KEY': simpleHashApiKey,
                accept: 'application/json',
            },
        })
        if (!response.ok) {
            console.error('could not fetch from simplehash', response.status)
            return contractMetadata
        }
        const data = (await response.json()) as SimpleHashCollectionsResponse
        const collectionWithImage = data.collections.find((x) => !!x.image_url)

        if (!collectionWithImage) {
            return contractMetadata
        }

        return {
            ...contractMetadata,
            imageUrl: collectionWithImage.image_url,
        }
    } catch (error) {
        console.error('could not fetch from simplehash', error)
        return contractMetadata
    }
}

export function generatePublicClients(supportedChainIds: number[], alchemyApiKey: string) {
    return supportedNftNetworkMap(supportedChainIds).map((n) => {
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
