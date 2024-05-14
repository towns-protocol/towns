import { Environment, withCorsHeaders } from 'worker-common'
import { TokenProviderRequest, TokenType } from '../../types'
import {
    fetchAlchemyContractMetadata,
    generateAlchemyNftUrl,
    mapSupportedChainIds,
    supportedNftNetworkMap,
    toContractMetadata,
} from '../../utils'

export const getCollectionMetadataAcrossNetworks = async (
    request: TokenProviderRequest,
    alchemyApiKey: string,
    env: Environment,
) => {
    const { query } = request

    const { contractAddress, supportedChainIds: supportedIdString } = query || {}
    const supportedChainIds = mapSupportedChainIds(supportedIdString)

    try {
        // get a list of the same contract across all supported networks. the client can choose priority to sort the results if multiple hits
        const allResults = await Promise.all(
            supportedNftNetworkMap(supportedChainIds).map(async (network) => {
                try {
                    const rpcUrl = generateAlchemyNftUrl(
                        supportedChainIds,
                        network.vChain.id,
                        alchemyApiKey,
                    )
                    const json = await fetchAlchemyContractMetadata(rpcUrl, contractAddress)

                    return {
                        chainId: network.vChain.id,
                        data: toContractMetadata(json),
                    }
                } catch (error) {
                    return {
                        chainId: network.vChain.id,
                        data: {
                            tokenType: TokenType.NOT_A_CONTRACT,
                        },
                    }
                }
            }),
        )
        const body = JSON.stringify(allResults)
        const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request, env) }
        return new Response(body, { headers })
    } catch (error) {
        return new Response(`Error ${JSON.stringify(error)}`, { status: 500 })
    }
}
