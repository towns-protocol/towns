import { Environment, withCorsHeaders } from 'worker-common'
import { GetCollectionsForOwnerResponse, TokenProviderRequest } from '../../types'

import { withOpenSeaImage, fetchAlchemyNfts } from '../../utils'

export const getCollectionsForOwner = async (request: TokenProviderRequest, env: Environment) => {
    const { rpcUrl, params, query } = request

    const { wallet } = params || {}

    const pageKey = query?.pageKey || ''

    const json = await fetchAlchemyNfts(rpcUrl, wallet, pageKey)
    json.contracts = withOpenSeaImage(json.contracts)

    try {
        while (json.pageKey) {
            const res = await fetchAlchemyNfts(rpcUrl, wallet, json.pageKey || '')
            json.pageKey = res.pageKey
            json.contracts = [...json.contracts, ...withOpenSeaImage(res.contracts)]
        }

        const collectionResponseForClient: GetCollectionsForOwnerResponse = {
            totalCount: json.totalCount,
            collections: json.contracts,
        }

        const body = JSON.stringify(collectionResponseForClient)

        const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request, env) }
        return new Response(body, { headers })
    } catch (error) {
        return new Response(`Error ${JSON.stringify(error)}`, { status: 500 })
    }
}
