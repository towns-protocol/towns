import { withCorsHeaders } from 'worker-common'
import { ContractMetadata, Env, TokenProviderRequest, TokenType } from '../../types'
import {
    fetchAlchemyContractMetadata,
    fetchAlchemyTokenMetadata,
    generateAlchemyNftUrl,
    mapSupportedChainIds,
    supportedTokenNetworkMap,
    toContractMetadata,
    withSimpleHashImage,
} from '../../utils'

export const getCollectionMetadataAcrossNetworks = async (
    request: TokenProviderRequest,
    env: Env,
) => {
    const { query } = request

    const {
        contractAddress,
        supportedChainIds: supportedIdString,
        chainId: specificChainId,
    } = query || {}
    const supportedChainIds = mapSupportedChainIds(supportedIdString)

    try {
        let networksToFetch = supportedTokenNetworkMap(supportedChainIds)

        // If a specific chainId is provided, filter to only that network
        if (specificChainId && specificChainId !== 'undefined') {
            const chainIdNumber = parseInt(specificChainId as string, 10)
            networksToFetch = networksToFetch.filter(
                (network) => network.vChain.id === chainIdNumber,
            )
        }

        const allResults = await Promise.all(
            networksToFetch.map(async (network) => {
                const chainId = network.vChain.id
                try {
                    const rpcUrl = generateAlchemyNftUrl(
                        supportedChainIds,
                        chainId,
                        env.ALCHEMY_API_KEY,
                    )

                    let nftMetadata:
                        | Awaited<ReturnType<typeof fetchAlchemyContractMetadata>>
                        | undefined

                    let tokenMetadata:
                        | Awaited<ReturnType<typeof fetchAlchemyTokenMetadata>>
                        | undefined

                    // Fetch both NFT and token metadata
                    const [nftResult, tokenResult] = await Promise.allSettled([
                        fetchAlchemyContractMetadata(rpcUrl, contractAddress),
                        fetchAlchemyTokenMetadata(
                            supportedChainIds,
                            chainId,
                            env.ALCHEMY_API_KEY,
                            contractAddress,
                        ),
                    ])

                    if (nftResult.status === 'fulfilled') {
                        nftMetadata = nftResult.value
                        if (nftMetadata.tokenType === TokenType.NOT_A_CONTRACT) {
                            return {
                                chainId,
                                data: {
                                    tokenType: TokenType.NOT_A_CONTRACT,
                                },
                            }
                        }
                    } else {
                        console.error('Error fetching NFT metadata:', nftResult.reason)
                    }
                    // Determine if it's an NFT or a token

                    let data: ContractMetadata
                    if (
                        nftMetadata &&
                        nftMetadata.tokenType !== TokenType.NO_SUPPORTED_NFT_STANDARD
                    ) {
                        // TODO: remove simplehash dependency https://linear.app/hnt-labs/issue/HNT-7233/remove-simplehash-in-token-worker-once-alchemy-supports-other-networks
                        // data should be toContractMetadata(json)
                        data = await withSimpleHashImage({
                            chainId,
                            contractMetadata: toContractMetadata(nftMetadata),
                            simpleHashApiKey: env.SIMPLEHASH_API_KEY,
                        })
                    } else {
                        if (tokenResult.status === 'fulfilled') {
                            tokenMetadata = tokenResult.value
                        } else {
                            console.error('Error fetching token metadata:', tokenResult.reason)
                            return {
                                chainId,
                                data: {
                                    tokenType: TokenType.NOT_A_CONTRACT,
                                },
                            }
                        }

                        data = {
                            address: contractAddress,
                            name: tokenMetadata.name,
                            symbol: tokenMetadata.symbol,
                            tokenType: TokenType.ERC20,
                            decimals: tokenMetadata.decimals,
                            imageUrl: tokenMetadata.logo,
                        }
                    }

                    return {
                        chainId,
                        data,
                    }
                } catch (error) {
                    console.error(`Error fetching metadata for chainId ${chainId}:`, error)
                    return {
                        chainId,
                        data: {
                            tokenType: TokenType.NOT_A_CONTRACT,
                            error: error instanceof Error ? error.message : String(error),
                        },
                    }
                }
            }),
        )
        const body = JSON.stringify(allResults)
        const headers = {
            'Content-type': 'application/json',
            ...withCorsHeaders(request, env.ENVIRONMENT),
        }
        return new Response(body, { headers })
    } catch (error) {
        return new Response(`Error ${JSON.stringify(error)}`, { status: 500 })
    }
}
