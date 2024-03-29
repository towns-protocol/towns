import { Environment, withCorsHeaders } from 'worker-common'
import {
    GetCollectionsForOwnerAcrossNetworksResponse,
    GetCollectionsForOwnerResponse,
    TokenProviderRequest,
} from '../../types'
import {
    fetchAlchemyNfts,
    generateAlchemyNftUrl,
    supportedNftNetworks,
    withOpenSeaImage,
} from '../../utils'

export const getCollectionsForOwnerAcrossNetworks = async (
    request: TokenProviderRequest,
    alchemyApiKey: string,
    env: Environment,
) => {
    const { params, query } = request

    const { wallet } = params || {}

    try {
        const allResults: GetCollectionsForOwnerAcrossNetworksResponse[] = await Promise.all(
            supportedNftNetworks.map(async (network) => {
                try {
                    const pageKey = query?.pageKey || ''
                    const rpcUrl = generateAlchemyNftUrl(network.vChain.id, alchemyApiKey)
                    const json = await fetchAlchemyNfts(rpcUrl, wallet, pageKey)
                    json.contracts = withOpenSeaImage(json.contracts)

                    while (json.pageKey) {
                        const res = await fetchAlchemyNfts(rpcUrl, wallet, json.pageKey || '')
                        json.pageKey = res.pageKey
                        json.contracts = [...json.contracts, ...withOpenSeaImage(res.contracts)]
                    }

                    const collectionResponseForClient: GetCollectionsForOwnerResponse = {
                        totalCount: json.totalCount,
                        collections: json.contracts,
                    }

                    return {
                        chainId: network.vChain.id,
                        status: 'success',
                        data: collectionResponseForClient,
                        error: undefined,
                    }
                } catch (error) {
                    return {
                        chainId: network.vChain.id,
                        status: 'error',
                        data: undefined,
                        error,
                    }
                }
            }),
        )

        const body = JSON.stringify(allResults)

        const headers = {
            'Content-type': 'application/json',
            ...withCorsHeaders(request, env),
        }

        return new Response(body, { headers })
    } catch (error) {
        return new Response(`Error ${JSON.stringify(error)}`, { status: 500 })
    }
}
