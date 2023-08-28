import { withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../router'
import { IsHolderOfCollectionAlchemyResponse, TokenProviderRequest } from '../types'

const fetchIsHolderOfCollection = async (
    rpcUrl: string,
    wallet: string,
    contractAddress: string,
): Promise<IsHolderOfCollectionAlchemyResponse> => {
    const response = await fetch(
        `${rpcUrl}/isHolderOfCollection?wallet=${wallet}&contractAddress=${contractAddress}`,
    )
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return response.json()
}

export const isHolderOfCollection = async (request: TokenProviderRequest) => {
    const { rpcUrl, query } = request

    const { contractAddress, wallet } = query || {}

    let json
    try {
        json = await fetchIsHolderOfCollection(rpcUrl, wallet, contractAddress)
    } catch (error) {
        return new Response(`Cant fetch alchemy data: ${JSON.stringify(error)}`, { status: 500 })
    }

    const body = JSON.stringify(json)

    const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request) }
    return new Response(body, { headers })
}
