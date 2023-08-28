import { Environment, withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../../router'
import {
    GetCollectionsForOwnerResponse,
    GetContractsForOwnerAlchemyResponse,
    TokenProviderRequest,
} from '../../types'

const fetchAlchemyNfts = async (
    rpcUrl: string,
    wallet: string,
    pageKey: string,
): Promise<GetContractsForOwnerAlchemyResponse> => {
    let url = `${rpcUrl}/getContractsForOwner?owner=${wallet}`

    if (pageKey) {
        url = url.concat(`&pageKey=${pageKey}`)
    }

    // alchemy changed things up and filter doesn't work on goerli
    if (rpcUrl.includes('eth-mainnet')) {
        url = url.concat('&includeFilters[]=SPAM')
    }

    try {
        const response = await fetch(url)
        if (!response.ok) {
            throwCustomError(
                (await response.text?.()) || 'could not fetch from alchemy',
                response.status,
            )
        }

        return response.json()
    } catch (error) {
        throw throwCustomError(JSON.stringify(error), (error as unknown as { code: number })?.code)
    }
}

export const getCollectionsForOwner = async (request: TokenProviderRequest, env: Environment) => {
    const { rpcUrl, params, query } = request

    const { wallet } = params || {}

    const pageKey = query?.pageKey || ''

    const json = await fetchAlchemyNfts(rpcUrl, wallet, pageKey)

    try {
        while (json.pageKey) {
            const res = await fetchAlchemyNfts(rpcUrl, wallet, json.pageKey || '')
            json.pageKey = res.pageKey
            json.contracts = [...json.contracts, ...res.contracts]
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
