import { withCorsHeaders } from 'worker-common'
import { Env, TokenProviderRequest, TokenType } from '../../types'
import {
    fetchAlchemyContractMetadata,
    generateAlchemyNftUrl,
    mapSupportedChainIds,
    supportedNftNetworkMap,
    toContractMetadata,
    withSimpleHashImage,
} from '../../utils'

export const getCollectionMetadataAcrossNetworks = async (
    request: TokenProviderRequest,
    env: Env,
) => {
    const { query } = request

    const { contractAddress, supportedChainIds: supportedIdString } = query || {}
    const supportedChainIds = mapSupportedChainIds(supportedIdString)

    try {
        // get a list of the same contract across all supported networks. the client can choose priority to sort the results if multiple hits
        const allResults = await Promise.all(
            supportedNftNetworkMap(supportedChainIds).map(async (network) => {
                const chainId = network.vChain.id
                try {
                    const rpcUrl = generateAlchemyNftUrl(
                        supportedChainIds,
                        chainId,
                        env.ALCHEMY_API_KEY,
                    )
                    const json = await fetchAlchemyContractMetadata(rpcUrl, contractAddress)

                    return {
                        chainId,
                        // TODO: remove simplehash dependency https://linear.app/hnt-labs/issue/HNT-7233/remove-simplehash-in-token-worker-once-alchemy-supports-other-networks
                        // data should be toContractMetadata(json)
                        data: await withSimpleHashImage({
                            chainId,
                            contractMetadata: toContractMetadata(json),
                            simpleHashApiKey: env.SIMPLEHASH_API_KEY,
                        }),
                    }
                } catch (error) {
                    return {
                        chainId,
                        data: {
                            tokenType: TokenType.NOT_A_CONTRACT,
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
