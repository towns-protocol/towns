import { withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../../router'
import {
    ContractMetadata,
    Env,
    GetCollectionMetadataInfuraResponse,
    TokenProviderRequest,
} from '../../types'
import { removeNullCollectionValues } from './utils'

const fetchContractMetadata = async (
    rpcUrl: string,
    contractAddress: string,
    authHeader: string,
): Promise<GetCollectionMetadataInfuraResponse> => {
    const url = `${rpcUrl}/nfts/${contractAddress}`

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
    const json: GetCollectionMetadataInfuraResponse = await response.json()
    return removeNullCollectionValues(json)
}

export const getCollectionMetadata = async (request: TokenProviderRequest, env: Env) => {
    const { rpcUrl, query, authHeader } = request

    if (!authHeader) {
        return new Response('Missing auth header', { status: 400 })
    }

    const { contractAddress } = query || {}

    let json
    try {
        json = await fetchContractMetadata(rpcUrl, contractAddress, authHeader)
    } catch (error) {
        return new Response(`Cant fetch infura data: ${JSON.stringify(error)}`, {
            status: (error as unknown as { status: number })?.status || 500,
        })
    }

    const body = JSON.stringify(toContractMetadata(json))

    const headers = {
        'Content-type': 'application/json',
        ...withCorsHeaders(request, env.ENVIRONMENT),
    }
    return new Response(body, { headers })
}

function toContractMetadata(response: GetCollectionMetadataInfuraResponse): ContractMetadata {
    const { contract, name, symbol, tokenType } = response

    return {
        address: contract,
        name,
        symbol,
        tokenType,
        imageUrl: undefined,
    }
}
