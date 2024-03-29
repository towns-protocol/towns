import { Environment, withCorsHeaders } from 'worker-common'
import { TokenProviderRequest } from '../../types'
import {
    fetchAlchemyContractMetadata,
    generateAlchemyNftUrl,
    supportedNftNetworks,
    toContractMetadata,
} from '../../utils'

export const getCollectionMetadataAcrossNetworks = async (
    request: TokenProviderRequest,
    alchemyApiKey: string,
    env: Environment,
) => {
    const { query } = request

    const { contractAddress } = query || {}

    try {
        // get a list of the same contract across all supported networks. the client can choose priority to sort the results if multiple hits
        const allResults = await Promise.all(
            supportedNftNetworks.map(async (network) => {
                try {
                    const rpcUrl = generateAlchemyNftUrl(network.vChain.id, alchemyApiKey)
                    const json = await fetchAlchemyContractMetadata(rpcUrl, contractAddress)

                    return {
                        chainId: network.vChain.id,
                        data: toContractMetadata(json),
                    }
                } catch (error) {
                    return {
                        chainId: network.vChain.id,
                        data: undefined,
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
