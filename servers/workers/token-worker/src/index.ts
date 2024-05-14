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
import { generateAlchemyNftUrl, mapSupportedChainIds } from './utils'
import { getCollectionsForOwnerAcrossNetworks } from './handlers/alchemy/getCollectionsForOwnerAcrossNetworks'
import { getCollectionMetadataAcrossNetworks } from './handlers/alchemy/getCollectionMetadataAcrossNetworks'
import { getTokenType } from './handlers/getTokenType'
import { getTokenBalance } from './handlers/getTokenBalance'
import { TokenSchema, WalletList, tokenSchema, walletListSchema } from './requestSchemas'
import { getNftMetadata } from './handlers/alchemy/getNftMetadata'

// enum for supported providers
// currently only alchemy is supported
enum ProviderAlias {
    Alchemy = 'alchemy',
}

// adds a rpcUrl to the request object
const withNetwork = async (request: TokenProviderRequest, env: Env) => {
    const provider = request.params?.provider
    const chainIdStr = request.params?.network

    const { query } = request

    const { supportedChainIds } = query || {}

    if (!supportedChainIds) {
        return new Response('missing supportedChainIds', { status: 400 })
    }

    if (!provider || !chainIdStr) {
        return new Response('missing provider or network', { status: 400 })
    }
    const chainId = +chainIdStr

    switch (provider) {
        case ProviderAlias.Alchemy:
            {
                try {
                    request.rpcUrl = generateAlchemyNftUrl(
                        mapSupportedChainIds(supportedChainIds),
                        chainId,
                        env.ALCHEMY_API_KEY,
                    )
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

    .get(`/api/getTokenType/:address`, (request: TokenProviderRequest, env: Env) => {
        const address = request.params?.address
        const headers = withCorsHeaders(request, env.ENVIRONMENT)
        if (!address) {
            return new Response('missing address', { status: 400 })
        }
        const supportedChainIds = request.query?.supportedChainIds
        if (!supportedChainIds) {
            return new Response('missing supportedChainIds', { status: 400 })
        }
        try {
            const tokenType = getTokenType(
                address,
                mapSupportedChainIds(supportedChainIds),
                env.ALCHEMY_API_KEY,
            )
            return new Response(JSON.stringify({ data: tokenType }), { status: 200, headers })
        } catch (error) {
            return new Response(JSON.stringify({ error }), { status: 500, headers })
        }
    })

    /**
     * getNftMetadata
     * get metadata for a specific token id, including owners
     *
     * requires a contractAddress query param
     * requires a tokenId query param
     * requires a chainId query param
     *
     * example
     *  /api/getNftMetadata?contractAddress=0x1&tokenId=1&chainId=1
     */
    .get(`/api/getNftMetadata`, async (request: TokenProviderRequest, env: Env) => {
        const contractAddress = request.query?.contractAddress
        const tokenId = request.query?.tokenId
        const chainId = parseInt(request.query?.chainId ?? '')
        const supportedChainIds = request.query?.supportedChainIds
        const headers = withCorsHeaders(request, env.ENVIRONMENT)

        if (!supportedChainIds) {
            return new Response('missing supportedChainIds', { status: 400 })
        }

        if (!contractAddress) {
            return new Response('missing contract address', { status: 400 })
        }
        if (!tokenId) {
            return new Response('missing token id', { status: 400 })
        }
        if (isNaN(chainId) || chainId < 1) {
            return new Response('missing chain id', { status: 400 })
        }
        try {
            const metadata = await getNftMetadata(
                chainId,
                contractAddress,
                tokenId,
                mapSupportedChainIds(supportedChainIds),
                env.ALCHEMY_API_KEY,
            )
            return new Response(JSON.stringify(metadata), { status: 200, headers })
        } catch (error) {
            return new Response(JSON.stringify({ error }), { status: 500, headers })
        }
    })

    .post(`/api/tokenBalance`, async (request: TokenProviderRequest, env: Env) => {
        const json = (await request.json()) as {
            token: TokenSchema
            wallets: WalletList
        }
        const { token, wallets } = json
        const headers = withCorsHeaders(request, env.ENVIRONMENT)
        const supportedChainIds = request.query?.supportedChainIds

        if (!supportedChainIds) {
            return new Response('missing supportedChainIds', { status: 400 })
        }

        const tokenParse = tokenSchema.safeParse(token)
        if (!tokenParse.success) {
            console.error('invalid token', tokenParse.error)
            return new Response(
                JSON.stringify({
                    error: 'invalid token',
                    details: tokenParse.error,
                }),
                { status: 400, headers },
            )
        }

        const walletsParse = walletListSchema.safeParse(wallets)

        if (!walletsParse.success) {
            console.error('invalid wallet list', walletsParse.error)
            return new Response(
                JSON.stringify({
                    error: 'invalid wallets',
                    details: walletsParse.error,
                }),
                { status: 400, headers },
            )
        }

        const _token = tokenParse.data
        const _wallets = walletsParse.data

        try {
            const balance = await getTokenBalance({
                token: _token,
                walletAddresses: _wallets,
                alchemyApiKey: env.ALCHEMY_API_KEY,
                environment: env.ENVIRONMENT,
                supportedChainIds: mapSupportedChainIds(supportedChainIds),
            })
            return new Response(JSON.stringify({ data: balance }), { status: 200, headers })
        } catch (error) {
            return new Response(JSON.stringify({ error }), { status: 500, headers })
        }
    })

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
