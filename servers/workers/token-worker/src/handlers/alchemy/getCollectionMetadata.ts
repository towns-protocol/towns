import { Environment, withCorsHeaders } from 'worker-common'
import { TokenProviderRequest } from '../../types'
import { fetchAlchemyContractMetadata, toContractMetadata } from '../../utils'

export const getCollectionMetadata = async (request: TokenProviderRequest, env: Environment) => {
    const { rpcUrl, query } = request

    const { contractAddress } = query || {}

    let json
    try {
        json = await fetchAlchemyContractMetadata(rpcUrl, contractAddress)
    } catch (error) {
        return new Response(`Cant fetch alchemy data: ${JSON.stringify(error)}`, { status: 500 })
    }

    const body = JSON.stringify(toContractMetadata(json))

    const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request, env) }
    return new Response(body, { headers })
}
