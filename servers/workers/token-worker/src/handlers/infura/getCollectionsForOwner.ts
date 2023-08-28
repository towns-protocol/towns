import { Environment, withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../../router'
import {
    GetCollectionsForOwnerInfuraResponse,
    GetCollectionsForOwnerResponse,
    TokenProviderRequest,
} from '../../types'
import { removeNullCollectionValues } from './utils'

const fetchCollections = async (
    rpcUrl: string,
    wallet: string,
    cursor: string,
    authHeader: string,
): Promise<GetCollectionsForOwnerInfuraResponse> => {
    const url = `${rpcUrl}/accounts/${wallet}/assets/collections?cursor=${cursor}`

    const response = await fetch(url, {
        headers: {
            Authorization: authHeader,
        },
    })
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from infura',
            response.status,
        )
    }
    const json: GetCollectionsForOwnerInfuraResponse = await response.json()
    return {
        ...json,
        // infura can return `null` values, remove them
        collections: json.collections.map((c) => removeNullCollectionValues(c)),
    }
}

export const getCollectionsForOwner = async (request: TokenProviderRequest, env: Environment) => {
    const { rpcUrl, authHeader, params } = request

    if (!authHeader) {
        return new Response('Missing auth header', { status: 400 })
    }

    const { wallet } = params || {}
    const json = await fetchCollections(rpcUrl, wallet, '', authHeader)

    while (json.cursor) {
        const res = await fetchCollections(rpcUrl, wallet, json.cursor, authHeader)
        json.cursor = res.cursor
        json.collections = [...json.collections, ...res.collections]
    }

    const collectionResponseForClient: GetCollectionsForOwnerResponse = {
        totalCount: json.total,
        collections: json.collections.map((c) => {
            const { contract, ...rest } = c
            return {
                address: contract,
                ...rest,
            }
        }),
    }

    const body = JSON.stringify(collectionResponseForClient)

    const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request, env) }
    return new Response(body, { headers })
}
