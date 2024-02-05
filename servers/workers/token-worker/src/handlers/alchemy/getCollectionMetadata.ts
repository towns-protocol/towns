import { Environment, withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../../router'
import {
    ContractMetadata,
    GetContractMetadataAlchemyResponse,
    TokenProviderRequest,
} from '../../types'

const fetchContractMetadata = async (
    rpcUrl: string,
    contractAddress: string,
): Promise<GetContractMetadataAlchemyResponse> => {
    const response = await fetch(`${rpcUrl}/getContractMetadata?contractAddress=${contractAddress}`)
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return response.json()
}

export const getCollectionMetadata = async (request: TokenProviderRequest, env: Environment) => {
    const { rpcUrl, query } = request

    const { contractAddress } = query || {}

    let json
    try {
        json = await fetchContractMetadata(rpcUrl, contractAddress)
    } catch (error) {
        return new Response(`Cant fetch alchemy data: ${JSON.stringify(error)}`, { status: 500 })
    }

    const body = JSON.stringify(toContractMetadata(json))

    const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request, env) }
    return new Response(body, { headers })
}

function toContractMetadata(response: GetContractMetadataAlchemyResponse): ContractMetadata {
    const { contractMetadata, address } = response

    return {
        address,
        name: contractMetadata.name,
        symbol: contractMetadata.symbol,
        tokenType: contractMetadata.tokenType,
        imageUrl: contractMetadata.openSeaMetadata?.imageUrl,
    }
}
