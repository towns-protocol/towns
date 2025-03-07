import { withCorsHeaders } from 'worker-common'
import { Env, TokenProviderRequest } from '../../types'
import { fetchAlchemyContractMetadata, toContractMetadata } from '../../utils'

export const getCollectionMetadata = async (request: TokenProviderRequest, env: Env) => {
    if (!request.params?.network) {
        return new Response('Missing network query param', { status: 400 })
    }

    const { rpcUrl, query } = request

    if (!rpcUrl) {
        return new Response('missing rpcUrl', { status: 400 })
    }

    const { contractAddress } = query || {}

    let json
    try {
        json = await fetchAlchemyContractMetadata(rpcUrl, contractAddress)
    } catch (error) {
        return new Response(`Cant fetch alchemy data: ${JSON.stringify(error)}`, { status: 500 })
    }

    const body = JSON.stringify(toContractMetadata(json))

    const headers = {
        'Content-type': 'application/json',
        ...withCorsHeaders(request, env.ENVIRONMENT),
    }
    return new Response(body, { headers })
}
