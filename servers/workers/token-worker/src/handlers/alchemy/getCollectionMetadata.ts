import { withCorsHeaders } from 'worker-common'
import { Env, TokenProviderRequest } from '../../types'
import { fetchAlchemyContractMetadata, toContractMetadata, withSimpleHashImage } from '../../utils'

export const getCollectionMetadata = async (request: TokenProviderRequest, env: Env) => {
    if (!request.params?.network) {
        return new Response('Missing network query param', { status: 400 })
    }

    const chainId = +request.params?.network

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

    const body = JSON.stringify(
        // TODO: remove simplehash dependency https://linear.app/hnt-labs/issue/HNT-7233/remove-simplehash-in-token-worker-once-alchemy-supports-other-networks
        // data should be toContractMetadata(json)
        await withSimpleHashImage({
            chainId,
            contractMetadata: toContractMetadata(json),
            simpleHashApiKey: env.SIMPLEHASH_API_KEY,
        }),
    )

    const headers = {
        'Content-type': 'application/json',
        ...withCorsHeaders(request, env.ENVIRONMENT),
    }
    return new Response(body, { headers })
}
