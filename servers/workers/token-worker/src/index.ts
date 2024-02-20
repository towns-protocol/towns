import {
    isAuthedRequest,
    withCorsHeaders,
    getOptionsResponse,
    isOptionsRequest,
} from 'worker-common'
import { getCollectionMetadata } from './handlers/alchemy/getCollectionMetadata'
import { router } from './router'
import { Env, TokenProviderRequest } from './types'
import { getCollectionsForOwner } from './handlers/alchemy/getCollectionsForOwner'
import { generateAlchemyUrl } from './utils'
import { getCollectionsForOwnerAcrossNetworks } from './handlers/alchemy/getCollectionsForOwnerAcrossNetworks'
import { getCollectionMetadataAcrossNetworks } from './handlers/alchemy/getCollectionMetadataAcrossNetworks'

// enum for supported providers
// currently only alchemy is supported
enum ProviderAlias {
    Alchemy = 'alchemy',
}

// adds a rpcUrl to the request object
const withNetwork = async (request: TokenProviderRequest, env: Env) => {
    const provider = request.params?.provider
    const chainIdStr = request.params?.network

    if (!provider || !chainIdStr) {
        return new Response('missing provider or network', { status: 400 })
    }
    const chainId = +chainIdStr

    switch (provider) {
        case ProviderAlias.Alchemy:
            {
                try {
                    request.rpcUrl = generateAlchemyUrl(chainId, env.ALCHEMY_API_KEY)
                } catch (error) {
                    return new Response(`invalid chainId:: ${chainId}`, { status: 400 })
                }
            }
            break
        default:
            return new Response(`invalid provider:: ${provider}`, { status: 400 })
    }
}

router
    /**
     * getCollectionsForOwner
     * get all collections for a wallet
     *
     * examples
     * ALCHEMY: /api/getCollectionsForOwner/alchemy/1/0x0
     */
    .get(
        '/api/getCollectionsForOwner/:provider/:network/:wallet',
        withNetwork,
        (request: TokenProviderRequest, env: Env) => {
            return getCollectionsForOwner(request, env.ENVIRONMENT)
        },
    )

    /**
     * getCollectionsForOwnerAcrossNetworks
     * get all collections for a wallet across supported networks - see utils.supportedNftNetworks
     *
     * examples
     * ALCHEMY: /api/getCollectionsForOwner/alchemy/1/0x0
     */
    .get(
        '/api/getCollectionsForOwnerAcrossNetworks/:provider/:wallet',
        (request: TokenProviderRequest, env: Env) => {
            return getCollectionsForOwnerAcrossNetworks(
                request,
                env.ALCHEMY_API_KEY,
                env.ENVIRONMENT,
            )
        },
    )

    /**
     * getCollectionMetadata
     * get metadata for a collection
     *
     * requires a contractAddress query param
     * TODO: change query param to path param
     *
     * examples
     * ALCHEMY: /api/getCollectionMetadata/alchemy/1?contractAddress=0x0
     */
    .get(
        '/api/getCollectionMetadata/:provider/:network',
        withNetwork,
        (request: TokenProviderRequest, env: Env) => {
            return getCollectionMetadata(request, env.ENVIRONMENT)
        },
    )

    /**
     * getCollectionMetadataAcrossNetworks
     * get metadata for a collection
     *
     * requires a contractAddress query param
     * TODO: change query param to path param
     *
     * examples
     * ALCHEMY: /api/getCollectionMetadata/alchemy/1?contractAddress=0x0
     */
    .get(
        '/api/getCollectionMetadataAcrossNetworks/:provider',
        (request: TokenProviderRequest, env: Env) => {
            return getCollectionMetadataAcrossNetworks(
                request,
                env.ALCHEMY_API_KEY,
                env.ENVIRONMENT,
            )
        },
    )

    .get('*', () => new Response('Not found', { status: 404 }))

export const worker = {
    async fetch(request: Request, env: Env) {
        return router.handle(request, env)
    },
}

export default {
    fetch(request: Request, env: Env) {
        if (isOptionsRequest(request)) {
            return getOptionsResponse(request, env.ENVIRONMENT)
        }
        if (!isAuthedRequest(request, env)) {
            return new Response('Unauthorized', {
                status: 401,
                headers: withCorsHeaders(request, env.ENVIRONMENT),
            })
        }
        return worker.fetch(request, env)
    },
}
